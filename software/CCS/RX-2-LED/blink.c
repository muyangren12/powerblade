//***************************************************************************************
//  MSP430 Blink the LED Demo - Software Toggle P1.0
//
//  Description; Toggle P1.0 by xor'ing P1.0 inside of a software loop.
//  ACLK = n/a, MCLK = SMCLK = default DCO
//
//                MSP430x5xx
//             -----------------
//         /|\|              XIN|-
//          | |                 |
//          --|RST          XOUT|-
//            |                 |
//            |             P1.0|-->LED
//
//  J. Stevenson
//  Texas Instruments, Inc
//  July 2011
//  Built with Code Composer Studio v5
//
//***************************************************************************************

#include <msp430.h>				

/* This is a general purpose test program, which does 2 things:
 *
 * 1. Flashes TX and LEDR at a set frequency.
 * 2. Sets LEDG to whatever RX is.
 */

int main(void) {

	int j = 0;

	WDTCTL = WDTPW | WDTHOLD;		// Stop watchdog timer

	P2DIR &= ~(1 << 1);						// Set RX to input
	P2DIR |= (1 << 0);						// Set TX to output
	P2DIR |= (1 << 2);						// Set LEDG to output direction
	P1DIR |= (1 << 6);					    // Set LEDB to output direction
	P1DIR |= (1 << 7);					    // Set LEDR to output direction

	for(;;) {
		volatile unsigned int i;	// volatile to prevent optimization

		P1OUT ^= (1 << 6);				// Toggle LEDB using exclusive-OR
		P1OUT ^= (1 << 7);				// Toggle LEDR using exclusive-OR

		P2OUT ^= (1 << 0);				// Toggle TX using exclusive-OR

		i = 430000;					// SW Delay
		do {
			i--;
			j = (1 << 1) & P2IN; 	// Get RX Input
			if(j){
				P2OUT |= (1 << 2);	// Set LEDG on
			} else {
				P2OUT &= ~(1 << 2);	// Set LEDG off
			}
		} while(i != 0);
	}
	
	return 0;
}
