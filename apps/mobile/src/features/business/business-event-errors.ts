export const createBusinessEventRequestErrorBody = (error: unknown, language: "fi" | "en"): string => {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Failed to join event")) {
    return language === "fi"
      ? "Tapahtumaan liittyminen ei onnistunut juuri nyt. Päivitä näkymä ja yritä uudelleen."
      : "Joining the event failed right now. Refresh the view and try again.";
  }

  if (message.includes("Failed to leave event")) {
    return language === "fi"
      ? "Tapahtumasta poistuminen ei onnistunut juuri nyt. Päivitä näkymä ja yritä uudelleen."
      : "Leaving the event failed right now. Refresh the view and try again.";
  }

  if (message.includes("RPC returned no data")) {
    return language === "fi"
      ? "Palvelu ei palauttanut odotettua vastausta. Yritä hetken päästä uudelleen."
      : "The service did not return the expected response. Try again in a moment.";
  }

  return message.length > 0 ? message : language === "fi" ? "Tuntematon pyyntövirhe." : "Unknown request error.";
};
