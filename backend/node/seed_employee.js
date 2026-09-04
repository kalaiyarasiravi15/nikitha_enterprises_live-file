
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const sequelize = require('./config/db');

async function seed() {
    try {
        await sequelize.authenticate();
        const existing = await Admin.findOne({ where: { email: 'employee@anyrastrove.com' } });
        if (existing) {
            console.log('Employee already exists');
            return;
        }
        const hashed = await bcrypt.hash('employee123', 10);
        await Admin.create({
            name: 'Store Employee',
            email: 'employee@anyrastrove.com',
            password: hashed,
            role: 'employee'
        });
        console.log('Created employee account: employee@anyrastrove.com / employee123');
    } catch (e) {
        console.error(e.message);
    }
}
seed();

