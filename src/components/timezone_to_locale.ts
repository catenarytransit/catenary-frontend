export function timezone_to_locale(input_lang: string, timezone: string): string {
    if (input_lang.startsWith("en")) {
        switch (timezone) {
            case "America/Los_Angeles":
                return "en-US";
            case "America/New_York":
                return "en-US";
            case "America/Chicago":
                return "en-US";
            case "America/Denver":
                return "en-US";
            case "America/Vancouver":
                return "en-CA";
            case "America/Edmonton":
                return "en-CA";
            case "America/Toronto":
                return "en-CA";
            case "America/Montreal":
                return "en-CA";
            case "America/Halifax":
                return "en-CA";
            case "Europe/London":
                return "en-UK";
            default:
                return "en-UK";
        }
    } else {
        return input_lang;
    }
}