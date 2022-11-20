const BasePage = require('./BasePage');

class RootPage extends BasePage {
    constructor(config) {
        super(config);

        this.id = 'root';
    }

    async body() {
        const result = {};
        
        return this.makeBody(result);
    }
}

module.exports = RootPage;