type ScrapeSource = 'fetlife' | 'fetlifeNearby' | 'instagram' | 'tickettailor' | 'pluraPromoStats';

function bindScrapeButton(buttonId: string, sourceName: ScrapeSource) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener('click', () => {
        chrome.runtime.sendMessage(
            { action: 'scrapeSingleSource', source: sourceName },
            (response: { ok: boolean }) => {
                console.log(`🚀 Response from background (${sourceName}):`, response);
            }
        );
    });
}

bindScrapeButton('startFetlife', 'fetlife');
bindScrapeButton('startFetlifeNearby', 'fetlifeNearby');
bindScrapeButton('startInstagram', 'instagram');
bindScrapeButton('startTicketTailor', 'tickettailor');
bindScrapeButton('startPluraPromoStats', 'pluraPromoStats');

