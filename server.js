import app from "./app.js";
import dotenv from "dotenv";
import { createAdminUser } from "./scripts/createAdminUser.js";
import addDistributors from "./scripts/addDistributors.js";
dotenv.config();

//Start Server
app.listen(process.env.PORT || 3000, async () => {
  console.log(`Server started at port ${process.env.PORT || 3000}...`);

  // Create admin user if it doesn't exist
  await createAdminUser();
  
  // Initialize default distributors if they don't exist
  await addDistributors();
});
