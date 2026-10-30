/**
 * KrishiWorld — DealerLocatorService
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Counterfeit inputs are not a small problem for a small farmer — one
 * fake bag can cost a season. So this lookup has one hard rule: a dealer
 * only appears if Verified__c is true AND someone actually verified them
 * (Verification_By__c and Verification_Date__c are filled). Distance
 * comes second. Payment never comes first.
 */
public with sharing class DealerLocatorService {
    public static List<Dealer__c> findVerifiedDealersNear(Decimal lat, Decimal lon, Integer limitCount) {
        // In a real org: SOQL on Dealer__c where Verified__c = true,
        // ordered by distance. Distance needs a geolocation field or
        // an external geo service — I have left that choice open here
        // rather than faking a formula that looks precise but is not.
        return [
            SELECT Id, Name FROM Dealer__c
            WHERE Verified__c = true
            AND Verification_By__c != null
            AND Verification_Date__c != null
            LIMIT :limitCount
        ];
    }
}
