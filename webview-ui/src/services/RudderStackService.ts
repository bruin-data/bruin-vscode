import { RudderAnalytics } from "@rudderstack/analytics-js";

class RudderStackService {
  private static instance: RudderStackService;
  private rudderAnalytics = new RudderAnalytics();
  private enableTelemetry = false;

  private constructor() {
    const WRITE_KEY = "2q18Kcaed4aDOdwm2SRgz1vS6P6";
    const DATA_PLANE_URL = "https://getbruinbumlky.dataplane.rudderstack.com";

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'setTelemetryPreference') {
        this.enableTelemetry = message.payload;
        if (this.enableTelemetry) {
          this.initializeRudderStack(WRITE_KEY, DATA_PLANE_URL);
        }
      }
    });
  }
  
  private initializeRudderStack(writeKey: string, dataPlaneUrl: string) {
    try {
      this.rudderAnalytics.load(writeKey, dataPlaneUrl, {
        integrations: {
          All: true,
        },
        storage: {
          type: 'localStorage',
          entries: {
            userId: { type: 'localStorage' },
            userTraits: { type: 'localStorage' },
            anonymousId: { type: 'localStorage' },
            sessionInfo: { type: 'localStorage' },
          },
        },
        logLevel: 'DEBUG'
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
    if (!this.enableTelemetry) {
      return;
    }
    try {
      this.rudderAnalytics.page(pageName, properties);
    }
    catch (error) {
      console.error("Error tracking page view:", error);
    }
    }

  public trackEvent(eventName: string, properties: Record<string, any> = {}) {
    if (!this.enableTelemetry) {
      return;
    }
    try {
      this.rudderAnalytics.track(eventName, properties);
    }
    catch (error) {
      console.error("Error tracking event:", error);
    }
  }

  public identifyUser(userId: string, traits: Record<string, any> = {}) {
    if (!this.enableTelemetry) {
      return;
    }
    try {
      this.rudderAnalytics.identify(userId, traits);
    }
    catch (error) {
      console.error("Error identifying user:", error);
    }
  }
}

export default RudderStackService;