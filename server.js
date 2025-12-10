import app from "./app.js";
import dotenv from "dotenv";
import { createAdminUser } from "./scripts/createAdminUser.js";
dotenv.config();

//Start Server
app.listen(process.env.PORT || 3000, async () => {
  console.log(`Server started at port ${process.env.PORT || 3000}...`);

  // Create admin user if it doesn't exist
  await createAdminUser();
});
