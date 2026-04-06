import crypto from "crypto";

export class RampAgent {
    async getOnrampQuote(fiatAmount: number, fiatCurrency: string, targetStablecoin: string) {
        const moonpayRate = await this.mockMoonpayQuote(fiatAmount, fiatCurrency);
        const transakRate = await this.mockTransakQuote(fiatAmount, fiatCurrency);

        if (moonpayRate.netCryptoAmount > transakRate.netCryptoAmount) {
            return { provider: "MoonPay", quote: moonpayRate };
        } else {
            return { provider: "Transak", quote: transakRate };
        }
    }

    private async mockMoonpayQuote(fiatAmount: number, fiatCurrency: string) {
        // Mock 1 USD = 0.99 USDC (1% fee)
        return {
            fiatAmount,
            fiatCurrency,
            cryptoCurrency: "USDC",
            networkFee: 0.5,
            providerFee: fiatAmount * 0.01,
            netCryptoAmount: fiatAmount * 0.99 - 0.5
        };
    }

    private async mockTransakQuote(fiatAmount: number, fiatCurrency: string) {
        // Mock 1 USD = 0.98 USDC (2% fee)
        return {
            fiatAmount,
            fiatCurrency,
            cryptoCurrency: "USDC",
            networkFee: 0.2,
            providerFee: fiatAmount * 0.02,
            netCryptoAmount: fiatAmount * 0.98 - 0.2
        };
    }

    verifyMoonpaySignature(payload: string, signature: string, secret: string) {
        const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
        return expectedSig === signature;
    }
}
