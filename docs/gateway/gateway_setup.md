PowerBlade Gateway Setup
========================

Base gateway platform is the Swarm Gateway. Documentation can be found in the
[urban-heartbeat-kit](https://github.com/terraswarm/urban-heartbeat-kit) repo.
Software running on the gateway can be found in the
[lab11/gateway](https://github.com/lab11/gateway) repo.

# Disable unnecessary services
    sudo systemctl stop ble-nearby
    sudo systemctl disable ble-nearby
    sudo systemctl stop node-red
    sudo systemctl disable node-red

# Push data to GATD
    sudo scp <user@comptuer>:~/shed/projects/powerblade/powerblade_deployment/gatd.conf /etc/swarm-gateway/gatd.conf
    sudo systemctl enable gateway-mqtt-gatd
    sudo systemctl start gateway-mqtt-gatd

# Push data to EmonCMS
    sudo scp <user@computer>:~/shed/projects/powerblade/powerblade_deployment/emoncms.conf /etc/swarm-gateway/emoncms.conf
    sudo systemctl enable gateway-mqtt-emoncms
    sudo systemctl start gateway-mqtt-emoncms

# Log data locally
First Install a FAT32-formatted micro SD Card in the gateway. Then find the
sdcard with `fdisk -l` it's probably `/dev/mmcblk1p1`
    sudo mkdir /media/sdcard
    sudo mount -v /dev/mmcblk1p1 /media/sdcard
    sudo scp <user@computer>:~/shed/projects/powerblade/powerblade_deployment/log.conf /etc/swarm-gateway/log.conf
    sudo systemctl enable gateway-mqtt-log
    sudo systemctl start gateway-mqtt-log


# Common problems
To test that a service is working run `sudo systemctl status -l <SERVICE_NAME>`

If a service has failed, check that `npm install` has been run in its directory within `gateway/software/`

