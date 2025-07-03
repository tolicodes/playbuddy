document.getElementById('start').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startScrape' }, (response) => {
        console.log('🚀 Response from background:', response);
    });
});


document.getElementById('startNonPartyEvents').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'scrapeNonPartyEvents' }, (response) => {
        console.log('🚀 Response from background:', response);
    });
});
