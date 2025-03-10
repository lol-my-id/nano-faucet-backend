import { Currency } from "./utils";
import log from "./logger";

interface ExchangeRates {
  [key: string]: {
    rate: number;
    updatedAt: number;
  };
}

class ExchangeService {
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly MAX_DEVIATION = 0.1; // 10% max deviation
  private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private static readonly RETRY_INTERVALS = [60000, 300000, 900000]; // Retry backoff strategy
  private static readonly SUPPORTED_CURRENCIES = new Set<Currency>(['NANO', 'XDG', 'BAN']);

  private static rates: ExchangeRates = {};
  private static isUpdating = false;
  private static retryCount = 0;
  private static lastSuccessUpdate = 0;
  private static updateTimer?: NodeJS.Timeout;

  static get available(): boolean {
    return this.lastSuccessUpdate + ExchangeService.CACHE_TTL > Math.floor(Date.now() / 1000);
  }

  /**
   * Convert between currencies with enhanced validation
   */
  static convert(c1: Currency, c2: Currency, amount: number): number {
    if (!this.available) {
      throw new Error('Exchange service unavailable');
    }

    c1 = c1.toUpperCase() as Currency;
    c2 = c2.toUpperCase() as Currency;

    if (!ExchangeService.SUPPORTED_CURRENCIES.has(c1) || !ExchangeService.SUPPORTED_CURRENCIES.has(c2)) {
      throw new Error('Unsupported currency');
    }

    if (c1 === c2) return amount;

    const rate1 = this.rates[c1]?.rate;
    const rate2 = this.rates[c2]?.rate;

    if (!rate1 || !rate2) {
      throw new Error('Invalid exchange rates');
    }

    if (amount <= 0) {
      throw new Error('Invalid amount');
    }

    const nanoValue = amount * rate1;
    return Math.round((nanoValue / rate2) * 10000) / 10000;
  }

  /**
   * Start the update interval
   */
  static startService(): void {
    this.update(true).catch(error => {
      log.error('Initial update failed', error);
    });
  }

  static async update(retry = false): Promise<void> {
    if (this.isUpdating) {
      log.debug('Update already in progress');
      return;
    }

    try {
      this.isUpdating = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ExchangeService.REQUEST_TIMEOUT);

      const response = await fetch("https://data.nanswap.com/get-markets", {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      if (!this.validateResponse(json)) {
        throw new Error('Invalid API response structure');
      }

      const newRates = this.processRates(json);
      this.validatePriceDeviations(newRates);

      this.rates = newRates;
      this.lastSuccessUpdate = Math.floor(Date.now() / 1000);
      this.retryCount = 0;

      log.info('Exchange rates updated', this.createLogContext());
    } catch (error) {
      log.error('Update failed', error);
      this.handleUpdateError(retry);
    } finally {
      this.isUpdating = false;
      clearTimeout(this.updateTimer);
      if (retry) {
        this.updateTimer = setInterval(
          () => this.update(),
          ExchangeService.CACHE_TTL * 1000
        );
      }
    }
  }

  private static validateResponse(data: any): boolean {
    return Array.isArray(data) && data.every(entry => 
      typeof entry?.key === 'string' &&
      typeof entry?.midPrice === 'number' &&
      entry.key.includes('/')
    );
  }

  private static processRates(data: any[]): ExchangeRates {
    const newRates: ExchangeRates = {};

    for (const entry of data) {
      const [crypto] = entry.key.split('/');
      if (ExchangeService.SUPPORTED_CURRENCIES.has(crypto as Currency)) {
        newRates[crypto] = {
          rate: entry.midPrice,
          updatedAt: Math.floor(Date.now() / 1000)
        };
      }
    }

    return newRates;
  }

  private static validatePriceDeviations(newRates: ExchangeRates): void {
    for (const [currency, newRate] of Object.entries(newRates)) {
      const oldRate = this.rates[currency]?.rate;
      if (oldRate) {
        const deviation = Math.abs((newRate.rate - oldRate) / oldRate);
        if (deviation > ExchangeService.MAX_DEVIATION) {
          log.warn('Price deviation detected', {
            currency,
            oldRate,
            newRate: newRate.rate,
            deviation
          });
          
          this.lastSuccessUpdate = 0;
          log.fatal('Exchange rates invalidated');
        }
      }
    }
  }

  private static handleUpdateError(retry: boolean): void {
    if (retry && this.retryCount < ExchangeService.RETRY_INTERVALS.length) {
      const delay = ExchangeService.RETRY_INTERVALS[this.retryCount];
      this.retryCount++;
      setTimeout(() => this.update(true), delay);
      log.info(`Scheduled retry #${this.retryCount} in ${delay}ms`);
    }
  }

  private static createLogContext(): object {
    return {
      currencies: Object.fromEntries(
        Object.entries(this.rates).map(([k, v]) => [k, v.rate])
      ),
      age: Math.floor(Date.now() / 1000) - this.lastSuccessUpdate
    };
  }
}

export { ExchangeService };