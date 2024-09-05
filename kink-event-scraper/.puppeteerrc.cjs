const config = {
    headless: true, // Runs Chrome in headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Recommended for Cloud Run

};

if (process.env.NODE_ENV === 'production') {
    config.executablePath = '/usr/bin/google-chrome-stable';
}

module.exports = config;