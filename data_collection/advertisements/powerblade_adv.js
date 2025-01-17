#!/usr/bin/env node

var noble = require('noble');

var dedup = true;
if (process.argv.length >= 3 && process.argv[2] == "--all") {
    dedup = false;
}

var singleSource = false;
var pb_address;
if (process.argv.length >= 4 && process.argv[2] == "--addr") {
    singleSource = true;
    pb_address = process.argv[3];
    console.log("Looking for device " + pb_address);
}

var UMICH_COMPANY_ID = 0x02E0;
var POWERBLADE_SERVICE_ID = 0x11;
var OLD_COMPANY_ID = 0x4908;

// {BLE Address: Most recent sequence number} for each PowerBlade
var powerblade_sequences = {};

noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        console.log("Starting scan...");
        noble.startScanning([], true);
    } else {
        noble.stopScanning();
    }
});

noble.on('discover', function (peripheral) {

    // Advertisement found. Check if it is a PowerBlade
    //  PowerBlade data advertisements:
    //      Have a Manufacturer Specific Data section
    //      Have a Company Identifier of 0x02E0 (assigned to the University of Michigan, first two bytes of data)
    //      Have a service id of 0x11 (assigned to PowerBlade [internally], third byte of data)
    var advertisement = peripheral.advertisement;
    var company_id = 0;
    var service_id = 0;
    if (advertisement.manufacturerData !== undefined && advertisement.manufacturerData
            && advertisement.manufacturerData.length >= 3) {
        company_id = advertisement.manufacturerData.readUIntLE(0,2);
        service_id = advertisement.manufacturerData.readUInt8(2);
    }

    // also accept the old company ID of 4908 (no service ID) for compatibility
    if ((company_id == UMICH_COMPANY_ID && service_id == POWERBLADE_SERVICE_ID) ||
            company_id == OLD_COMPANY_ID) {
        // Found a PowerBlade
        var address  = peripheral.address;
        var data = advertisement.manufacturerData.slice(3);
        if (company_id == OLD_COMPANY_ID) {
            data = advertisement.manufacturerData.slice(2);
        }
        var recv_time = (new Date).getTime()/1000;

        if(singleSource == true) {
            if(address != pb_address) {
                return;
            }
        }

        // check length of data
        if (data.length < 19) {
            console.log("ERROR: Bad PowerBlade packet");
            console.log(data.length);
            console.log(data);
            console.log(advertisement);
            return;
        }

        // check software version number
        var version_num = data.readUIntBE(0,1);
        if (version_num < 1) {
            console.log("ERROR: PowerBlade version 0 discovered!");
            return;
        }

        // check for duplicate advertisements
        var sequence_num = data.readUIntBE(1,4);
        if (!(address in powerblade_sequences)) {
            powerblade_sequences[address] = -1;
        }
        if (dedup && powerblade_sequences[address] == sequence_num) {
            // duplicate advertisement. Don't display
            return;
        }
        powerblade_sequences[address] = sequence_num;

        // parse fields from advertisement
        var pscale = data.readUIntBE(5,2);
        var vscale =  data.readUIntBE(7,1);
        var whscale = data.readUIntBE(8,1);
        var v_rms = data.readUIntBE(9,1);
        var real_power = data.readUIntBE(10,2);
        var apparent_power = data.readUIntBE(12,2);
        var watt_hours = data.readUIntBE(14,4);
        var flags = data.readUIntBE(18,1);

        // calculate scaling values
        var volt_scale;
        if (version_num == 1) {
            volt_scale = vscale / 50;
        } else {
            // starting in version 2, vscale became bigger to allow for more
            //  precision in v_rms
            volt_scale = vscale / 200;
        }
        var power_scale = (pscale & 0x0FFF) * Math.pow(10,-1*((pscale & 0xF000) >> 12));
        var wh_shift = whscale;

        // scale measurements from PowerBlade
        var v_rms_disp = v_rms*volt_scale;
        var real_power_disp = real_power*power_scale;
        var app_power_disp = apparent_power*power_scale;
        if(volt_scale > 0) {
          var watt_hours_disp = (watt_hours << wh_shift)*(power_scale/3600);
        } else {
          var watt_hours_disp = watt_hours;
        }

        // Exponential subtraction
        // 6.6 and 0.015 are hard coded for PB version 1
        // PB version 2 and greater will transmit device-specific values with each packet
        // real_power_disp = real_power_disp - 6.6*Math.exp(-0.015*real_power_disp)

        var pf_disp = real_power_disp / app_power_disp;

        // display data to user
        console.log('PowerBlade (' + address +')');

        if (company_id == OLD_COMPANY_ID) {
            console.log("WARNING: Old PowerBlade packet format!");
        }
        else {
            if (flags & 0x80) {
                console.log('Calibrated unit');
            }
            else {
                console.log('WARNING: Uncalibrated unit')
            }
        }

        console.log('      Sequence Number: ' + sequence_num);
        console.log('          RMS Voltage: ' + v_rms_disp.toFixed(2) + ' V');
        console.log('           Real Power: ' + real_power_disp.toFixed(2) + ' W');
        console.log('       Apparent Power: ' + app_power_disp.toFixed(2) + ' VA');
        console.log('Cumulative Energy Use: ' + watt_hours_disp.toFixed(2) + ' Wh');
        console.log('         Power Factor: ' + pf_disp.toFixed(2));
        // console.log('Raw voltage: ' + v_rms.toFixed(2));
        // console.log('Volt scale: ' + volt_scale.toFixed(2));
        // console.log('Pscale: ' + pscale.toFixed(2));
        console.log('');
    }
});

