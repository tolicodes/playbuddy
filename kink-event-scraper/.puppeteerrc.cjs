module.exports = {
    // executablePath: '/usr/bin/google-chrome-stable',
    headless: true, // Runs Chrome in headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Recommended for Cloud Run

};
