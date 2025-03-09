// This code was written in 2023
import { Currency } from "./utils";
import log from "./logger";

interface ExchangeRates {
  [key: string]: number;
}

class ExchangeService {
    static get available(): boolean {
        return this.lastUpdate + 3600 > Math.floor(Date.now() / 1000);
    }

    private static lastUpdate: number;

    // Call update before converting (these are innacurate)
    private static rates: ExchangeRates = {
        'NANO': 1,
        'XDG': 0.001,
        'BAN': 0.007,
    };

    /**
     * Convert between currencies
     * @param c1 Base currency
     * @param c2 Currency to convert to
     * @param amount Amount of c1 currency to be converted
     * @returns Converted value
     */
    static convert(c1: Currency, c2: Currency, amount: number): number {
        c1 = c1.toUpperCase() as Currency;
        c2 = c2.toUpperCase() as Currency;

        // If currency is the same, just return what was provided
        if (c1 === c2) return amount;
        
        // Get rates for both cryptocurrencies
        const rates = [this.rates[c1], this.rates[c2]]; 
    
        // If any of them isn't supported (or real), throw an Error (with the current codebase, it shouldn't happen)
        if (!rates[0] || !rates[1]) {
          throw new Error('Invalid currency');
        }
    
        // Recalculate and round becasue $ANA has 20 0's
        const nanoValue = amount * rates[0];
        return Math.round(nanoValue / rates[1]*10000)/10000;
    }

    /**
     * Update exchange rates
     */
    static async update(startInterval: boolean = false): Promise<void> {
        // Fetch HTTP request
        const response = await fetch("https://data.nanswap.com/get-markets");
        
        // Detect failure
        if(!response.ok) {
            // If failed, retry in like minute or something
            setTimeout(async()=>{ await this.update(); }, 60000);
            return;
        }
        
        // Fetch response as JSON
        const json = await response.json(); 

        // Loop through every field
        for(const entry of json) {
            // Detect cryptocurrency
            let cryptocurrency = entry.key.split("/")[0];

            // Ignore unsupported cryptocurrency
            if(!Object.keys(this.rates).includes(cryptocurrency)) continue; 

            // Update the price
            this.rates[cryptocurrency] = entry.midPrice;
        }

        // Update timestamp
        this.lastUpdate = Math.floor(Date.now() / 1000);

        // Log
        log.debug('Exchange rates updated',`XDG: ${this.rates["XDG"]}, BAN: ${this.rates["BAN"]}`);

        if(startInterval) setInterval(this.update, 3600000);
    }

}

export { ExchangeService }