/**
 * Utility to format prices based on the user's country/currency.
 * Supported countries:
 * AO (Angola) -> Kz (pt-AO)
 * BR (Brazil) -> R$ (pt-BR)
 * PT (Portugal) -> € (pt-PT)
 * MZ (Mozambique) -> MT (pt-MZ)
 */

export const formatPrice = (price: number, countryCode: string = "AO") => {
    const code = countryCode?.toUpperCase() || "AO";

    let locale = "pt-AO";
    let currency = "AOA";
    let symbol = "Kz";

    switch (code) {
        case "BR":
            locale = "pt-BR";
            currency = "BRL";
            symbol = "R$";
            break;
        case "PT":
            locale = "pt-PT";
            currency = "EUR";
            symbol = "€";
            break;
        case "MZ":
            locale = "pt-MZ";
            currency = "MZN";
            symbol = "MT";
            break;
        default:
            locale = "pt-AO";
            currency = "AOA";
            symbol = "Kz";
    }

    // We use a custom format to match the premium aesthetics of the site
    // while keeping the specific currency symbol requested.
    const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

    return `${formatter.format(price)} ${symbol}`;
};

/**
 * Validates Angolan IBAN.
 * Rule: Must have 25 characters and start with AO06.
 * If 21 digits are provided, it's considered valid but needs formatting.
 */
export const validateIBAN = (iban: string, country: string = "AO"): { isValid: boolean; error?: string } => {
    if (country !== "AO") return { isValid: true }; // Skip validation for other countries for now

    const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();

    // Numeric only (21 digits)
    if (/^\d{21}$/.test(cleanIBAN)) {
        return { isValid: true };
    }

    // Full IBAN (AO06 + 21 digits)
    if (/^AO06\d{21}$/.test(cleanIBAN)) {
        return { isValid: true };
    }

    if (cleanIBAN.length !== 25 && cleanIBAN.length !== 21) {
        return { isValid: false, error: "O IBAN de Angola deve ter 21 dígitos numéricos ou 25 caracteres (AO06...)" };
    }

    if (cleanIBAN.length === 25 && !cleanIBAN.startsWith("AO06")) {
        return { isValid: false, error: "O IBAN de Angola deve começar com AO06" };
    }

    return { isValid: false, error: "IBAN Inválido" };
};

/**
 * Formats Angolan IBAN to the standard 25-character version.
 * If 21 digits are provided, prefixes with AO06.
 */
export const formatIBAN = (iban: string, country: string = "AO"): string => {
    if (country !== "AO") return iban;

    const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();

    if (/^\d{21}$/.test(cleanIBAN)) {
        return `AO06${cleanIBAN}`;
    }

    return cleanIBAN;
};
