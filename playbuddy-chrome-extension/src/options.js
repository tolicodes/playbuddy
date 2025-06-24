document.getElementById('start').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startScrape' }, (response) => {
        console.log('🚀 Response from background:', response);
    });
});
