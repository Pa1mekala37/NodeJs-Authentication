const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Register a user into the database api
app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userNameQuery = `select * from user where username = "${username}";`;
  const dbUser = await db.get(userNameQuery);
  if (dbUser === undefined) {
    //  create user
    if (password.length >= 5) {
      await db.run(`
        INSERT INTO
            user (username, name, password, gender, location)
        VALUES
            (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
            );`);
      response.send(`User created successfully`);
    } else {
      // send password short message
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    // send user exist message
    response.status(400);
    response.send("User already exists");
  }
});

// login api
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `select * from user where username="${username}";`;
  const dbUser = await db.get(userQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// change password api

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const dbUser = await db.get(
    `select * from user where username = "${username}";`
  );
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
  if (isPasswordMatched) {
    // check new password is not less than 5 characters.
    if (newPassword.length >= 5) {
      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      db.run(`UPDATE user SET password = "${newHashedPassword}"`);
      response.status(200);
      response.send("Password updated");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});

module.exports = app;