const express = require("express");
const cors = require("cors");
const server_instance = express();
const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");
const dbPath = path.join(__dirname, "user_details.db");
let dataBase = null;
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  credentials: true,
};

server_instance.use(cors(corsOptions));
server_instance.use(express.json());

const initialize_DataBase_and_Server = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    server_instance.listen(3002, () => {
      console.log("sever is running on http://localhost:3002");
    });
  } catch (error) {
    console.log(`DataBase Error ${error.message}`);
    process.exit(1);
  }
};

initialize_DataBase_and_Server();

server_instance.get("/user_management/", async (request, response) => {
  const { sort, page_no, search } = request.query;
  const limit = 10;
  const offset =
    page_no && !isNaN(page_no) && parseInt(page_no) > 0
      ? limit * (parseInt(page_no) - 1)
      : 0;
  let queryUserDetails;
  let queryParams;
  const sorting = sort === "ASC" || sort === "DESC" ? sort : "NORMAL";
  if (sorting === "NORMAL") {
    queryUserDetails = `SELECT * FROM user WHERE name LIKE '%' || ? || '%' OR contact LIKE '%' || ? || '%' 
    OR email LIKE '%' || ? || '%'  OR DOB LIKE '%' || ? || '%' OR userDescription LIKE '%' || ? || '%' LIMIT ? OFFSET ?;`;
    queryParams = [search, search, search, search, search, limit, offset];
  } else {
    queryUserDetails = `SELECT * FROM user WHERE name LIKE '%' || ? || '%' OR contact LIKE '%' || ? || '%' 
  OR email LIKE '%' || ? || '%' OR DOB LIKE '%' || ? || '%' OR  userDescription LIKE '%' || ? || '%' ORDER BY DOB  ${sorting} LIMIT ? OFFSET ?;`;
    queryParams = [search, search, search, search, search, limit, offset];
  }
  try {
    const userDetails = await dataBase.all(queryUserDetails, queryParams);
    if (userDetails.length !== 0) {
      response.send(userDetails);
    } else {
      response.status(404).send("No User Found");
    }
  } catch (error) {
    console.error("Database query error:", error.message);
    response.status(500).send("Internal server error.");
  }
});

server_instance.post("/user_management/", async (request, response) => {
  const { id, name, DOB, contact_no, email, user_description } = request.body;
  if (!id || !name || !DOB || !contact_no || !email || !user_description) {
    response
      .status(400)
      .send(
        "All fields (id, name, DOB, contact, email, userDescription) are required."
      );
  } else {
    try {
      const postUserDetails = `INSERT INTO user (id, name, DOB, contact, email, userDescription) VALUES (?, ?, ?, ?, ?, ?);`;
      await dataBase.run(postUserDetails, [
        id,
        name,
        DOB,
        contact_no,
        email,
        user_description,
      ]);
      response.status(200).send("User Created Successfully");
    } catch (error) {
      console.error("Error inserting product:", error);
      response.status(500).send("Internal server error while creating user");
    }
  }
});

server_instance.put("/user_management/:id", async (request, response) => {
  try {
    const { id } = request.params;
    const existUserQuery = `SELECT * FROM user WHERE id = ?`;
    const getExistUser = await dataBase.get(existUserQuery, [id]);

    if (!getExistUser) {
      response.status(404).send("User not found in the database");
      console.log("User not found in the database");
      return;
    }

    const {
      name = getExistUser.name,
      DOB = getExistUser.DOB,
      contact_no = getExistUser.contact,
      email = getExistUser.email,
      user_description = getExistUser.userDescription,
    } = request.body;

    const updateTableQuery = `
      UPDATE user
      SET name = ?, DOB = ?, contact = ?, email = ?, userDescription = ?
      WHERE id = ?;
    `;
    await dataBase.run(updateTableQuery, [
      name,
      DOB,
      contact_no,
      email,
      user_description,
      id,
    ]);

    response.status(200).send("User updated successfully");
    console.log("User updated successfully");
  } catch (error) {
    response.status(500).send("An error occurred while updating the user");
    console.error("An error occurred while updating the user:", error);
  }
});

server_instance.delete("/user_management/:id/", async (request, response) => {
  const { id } = request.params;
  const existUserQuery = `SELECT * FROM user WHERE id = ?;`;
  const getExistUser = await dataBase.get(existUserQuery, [id]);
  if (getExistUser === undefined) {
    response.status(404).send("No user data found");
  } else {
    const deleteUser = `DELETE FROM user WHERE id = ?; `;
    await dataBase.run(deleteUser, [getExistUser.id]);
    response.status(200).send("User Deleted Successfully");
  }
});

server_instance.delete("/user_management/", async (req, res) => {
  try {
    const deleteAllUsersQuery = "DELETE FROM user";
    await dataBase.run(deleteAllUsersQuery);
    res.status(200).send("All users deleted successfully");
  } catch (error) {
    console.error("Error deleting all users:", error);
    res.status(500).send("An error occurred while deleting all users.");
  }
});

// Global error handling middleware
server_instance.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Internal server error.");
});
