const sequelize = require('./config/db');
const ContactMessage = require('./models/ContactMessage');

async function test() {
    try {
        await sequelize.authenticate();
        console.log("Authenticated");
        const messages = await ContactMessage.findAll({ limit: 1 });
        console.log("Success:", messages);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit(0);
    }
}
test();
