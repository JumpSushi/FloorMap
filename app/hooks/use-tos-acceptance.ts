import { useState, useEffect } from "react";

const TOS_ACCEPTED_KEY = "floormap_tos_accepted";
const TOS_VERSION = "2025-07-31"; // Update this when TOS changes

export function useTOSAcceptance() {
  const [tosAccepted, setTosAccepted] = useState<boolean | null>(null);
  const [showTOSOverlay, setShowTOSOverlay] = useState(false);

  useEffect(() => {
    // Check if running in browser
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(TOS_ACCEPTED_KEY);
      const storedData = stored ? JSON.parse(stored) : null;
      
      // Check if TOS was accepted and if it's the current version
      const isAccepted = storedData?.accepted && storedData?.version === TOS_VERSION;
      
      setTosAccepted(isAccepted);
      setShowTOSOverlay(!isAccepted);
    } catch (error) {
      console.error("Error checking TOS acceptance:", error);
      setTosAccepted(false);
      setShowTOSOverlay(true);
    }
  }, []);

  const acceptTOS = () => {
    try {
      const acceptanceData = {
        accepted: true,
        version: TOS_VERSION,
        timestamp: new Date().toISOString(),
      };
      
      localStorage.setItem(TOS_ACCEPTED_KEY, JSON.stringify(acceptanceData));
      setTosAccepted(true);
      setShowTOSOverlay(false);
    } catch (error) {
      console.error("Error saving TOS acceptance:", error);
    }
  };

  const declineTOS = () => {
    try {
      localStorage.removeItem(TOS_ACCEPTED_KEY);
      setTosAccepted(false);
      // Redirect to a different page or show a message
      window.location.href = "https://www.google.com";
    } catch (error) {
      console.error("Error handling TOS decline:", error);
    }
  };

  return {
    tosAccepted,
    showTOSOverlay,
    acceptTOS,
    declineTOS,
  };
}
