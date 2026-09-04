
require('dotenv').config();
const { Admin } = require('./models');
async function run() {
  const admins = await Admin.findAll({ raw: true });
  console.log(admins);
  process.exit(0);
}
run();

