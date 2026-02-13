export const phoneConfigs: Record<string, { placeholder: string; label: string; prefix: string; digits: number }> = {
    AO: { placeholder: "9xx xxx xxx", label: "WhatsApp de Angola", prefix: "+244", digits: 9 },
    PT: { placeholder: "9xx xxx xxx", label: "WhatsApp de Portugal", prefix: "+351", digits: 9 },
    MZ: { placeholder: "8xx xxx xxx", label: "WhatsApp de Moçambique", prefix: "+258", digits: 9 },
    BR: { placeholder: "(xx) 9xxxx-xxxx", label: "WhatsApp do Brasil", prefix: "+55", digits: 11 },
};

export const formatPhone = (value: string, country: string): string => {
    const config = phoneConfigs[country];
    if (!config) return value;

    // Remove everything except numbers
    const numbers = value.replace(/\D/g, "");

    // If it starts with the prefix numbers, remove them to handle it cleanly
    const prefixNumbers = config.prefix.replace(/\D/g, "");
    let cleanNumbers = numbers;
    if (numbers.startsWith(prefixNumbers)) {
        cleanNumbers = numbers.slice(prefixNumbers.length);
    }

    // Limit to the allowed digits
    cleanNumbers = cleanNumbers.slice(0, config.digits);

    // Simple formatting (can be improved if needed)
    if (!cleanNumbers) return config.prefix + " ";

    return config.prefix + " " + cleanNumbers;
};

export const validatePhone = (value: string, country: string): boolean => {
    const config = phoneConfigs[country];
    if (!config) return false;

    const numbers = value.replace(/\D/g, "");
    const prefixNumbers = config.prefix.replace(/\D/g, "");

    let cleanNumbers = numbers;
    if (numbers.startsWith(prefixNumbers)) {
        cleanNumbers = numbers.slice(prefixNumbers.length);
    }

    return cleanNumbers.length === config.digits;
};
