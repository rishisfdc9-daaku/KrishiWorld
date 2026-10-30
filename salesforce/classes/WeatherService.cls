/**
 * KrishiWorld — WeatherService
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * A farmer does not need a forecast for a district. They need to know if
 * it will rain on their field in the next two days, and whether the last
 * three weeks were wet enough to make disease likely. That is why every
 * call here is by latitude/longitude, and why I ask for 3 weeks back,
 * not just today. Stub only — wire a Named Credential in, never a key
 * in code.
 */
public with sharing class WeatherService {
    // TODO (Rishi): Named Credential + callout for past 3 weeks + forecast.
    // Return weekly rain, temperature, humidity, and a one-line forecast.
    public static String getPastThreeWeeksSummary(Decimal lat, Decimal lon) {
        return null; // Stub: real provider to be wired in.
    }
}
