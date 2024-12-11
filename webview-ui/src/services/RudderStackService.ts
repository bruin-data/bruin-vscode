import { RudderAnalytics } from "@rudderstack/analytics-js";

class RudderStackService {
  private static instance: RudderStackService;
  private rudderAnalytics = new RudderAnalytics();

  private constructor() {
    const WRITE_KEY = "2q18Kcaed4aDOdwm2SRgz1vS6P6";
    const DATA_PLANE_URL = "https://getbruinbumlky.dataplane.rudderstack.com";

    try {
      this.rudderAnalytics.load(WRITE_KEY, DATA_PLANE_URL, {
        integrations: {
          All: true,
        },
        storage: {
          type: "localStorage",
        },
        logLevel: 'DEBUG',
      });
      console.log("RudderStack initialized:", this.rudderAnalytics);
    } catch (error) {
      console.error("RudderStack initialization error:", error);
    }
  }

  public static getInstance(): RudderStackService {
    if (!RudderStackService.instance) {
      RudderStackService.instance = new RudderStackService();
    }
    return RudderStackService.instance;
  }

  public trackPageView(pageName: string, properties: Record<string, any> = {}) {
    this.rudderAnalytics.page(pageName, properties);
  }

  public trackEvent(eventName: string, properties: Record<string, any> = {}) {
    this.rudderAnalytics.track(eventName, properties);
  }

  public identifyUser(userId: string, traits: Record<string, any> = {}) {
    this.rudderAnalytics.identify(userId, traits);
  }
}

export default RudderStackService;