const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require('jsonwebtoken')
const path = require("path");

const app = express();
const dbPath = path.join(__dirname, "taskManagementApplication.db");
app.use(cors()); // Enable CORS
app.use(express.json());
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

     // Enable JSON parsing for POST requests

    app.listen(5000, () => {
      console.log("Server started successfully on http://localhost:5000");
    });
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
};

initializeDbAndServer();

app.post("/register", async (request, response) => {
    const { name, email, password, role } = request.body;
  
    try {
      const getUserQuery = `SELECT * FROM users WHERE name = ?`;
      const dbUser = await db.get(getUserQuery, [name]);
  
      if (dbUser === undefined) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUserQuery = `INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)`;
        const dbResponse = await db.run(createUserQuery, [name, email, role, hashedPassword]);
  
        response.send({ id: dbResponse.lastID });
      } else {
        response.status(400).send({ message: "User Already Exists" });
      }
    } catch (error) {
      console.error("Error during registration:", error);
      response.status(500).send({ message: "Internal Server Error" });
    }
  });
  
  app.post("/login",async (request,response) => {
    const {username,password} = request.body
    try{
      const selectUserQuery = `SELECT * FROM users WHERE name = '${username}'`
      const dbUser = await db.get(selectUserQuery)
      if(dbUser === undefined){
        response.status(400).send({error:"User Doesn't exist"})
      }
      else{
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password);
        if(isPasswordMatched === true){
          const payLoad = {
            username:username,
          };
          const jwtToken = jwt.sign(payLoad,'Gunturu Karam');
          response.send({jwtToken})
        }
        else{
          response.status(400).send({error:"Invalid Password"})
        }
      }
    }
    catch(error){
      response.status(400).send({error:'Something went wrong'})
    }
  });

  app.post("/tasks", async (request, response) => {
    const { title, description, dueDate, status, assignedUser, priority } = request.body;
  
    try {
      const createTaskQuery = `
        INSERT INTO tasks (title, description, due_date, status, assigned_user, priority)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const dbResponse = await db.run(createTaskQuery, [
        title, description, dueDate, status, assignedUser, priority
      ]);
  
      response.send({ id: dbResponse.lastID });
    } catch (error) {
      console.error("Error creating task:", error);
      response.status(500).send({ message: "Internal Server Error" });
    }
  });

  
  app.put("/tasks/:taskId", async (request, response) => {
    const { taskId } = request.params;
    const { title, description, dueDate, status, assignedUser, priority } = request.body;
  
    try {
      const updateTaskQuery = `
        UPDATE tasks
        SET title = ?, description = ?, due_date = ?, status = ?, assigned_user = ?, priority = ?
        WHERE id = ?
      `;
      await db.run(updateTaskQuery, [title, description, dueDate, status, assignedUser, priority, taskId]);
  
      response.send({ message: "Task updated successfully" });
    } catch (error) {
      console.error("Error updating task:", error);
      response.status(500).send({ message: "Internal Server Error" });
    }
  });

  
  app.delete("/tasks/:taskId", async (request, response) => {
    const { taskId } = request.params;
  
    try {
      const deleteTaskQuery = `DELETE FROM tasks WHERE id = ?`;
      await db.run(deleteTaskQuery, [taskId]);
  
      response.send({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      response.status(500).send({ message: "Internal Server Error" });
    }
  });

  
  app.get("/tasks", async (request, response) => {
    const { status, priority, assignedUser, page = 1, limit = 10 } = request.query;
  
    let filterQuery = "SELECT * FROM tasks WHERE 1=1";
    const params = [];
  
    if (status) {
      filterQuery += " AND status = ?";
      params.push(status);
    }
    if (priority) {
      filterQuery += " AND priority = ?";
      params.push(priority);
    }
    if (assignedUser) {
      filterQuery += " AND assigned_user = ?";
      params.push(assignedUser);
    }
  
    const offset = (page - 1) * limit;
    filterQuery += ` LIMIT ${limit} OFFSET ${offset}`;
  
    try {
      const tasks = await db.all(filterQuery, params);
      response.send(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      response.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.get("/tasks/summary", async (request, response) => {
    const { status, assignedUser, startDate, endDate } = request.query;
  
    let reportQuery = "SELECT * FROM tasks WHERE 1=1";
    const params = [];
  
    if (status) {
      reportQuery += " AND status = ?";
      params.push(status);
    }
    if (assignedUser) {
      reportQuery += " AND assigned_user = ?";
      params.push(assignedUser);
    }
    if (startDate && endDate) {
      reportQuery += " AND due_date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
  
    try {
      const tasks = await db.all(reportQuery, params);
      response.send(tasks);  // Return as JSON
    } catch (error) {
      console.error("Error generating task summary:", error);
      response.status(500).send({ message: "Internal Server Error" });
    }
  });
  

