module.exports = {
    apps: [{
        name: "nexia-contract-seeker",
        script: "./build/app.js",
        log_date_format: "",
        out_file: "./temp/logs/app.out.log",
        error_file: "./temp/logs/app.error.log",
        interpreter: "node@16.14.0",
        autorestart: true,
        env: {
            "NODE_ENV": "production"
        }
    }]
}
