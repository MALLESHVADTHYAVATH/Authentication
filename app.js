const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const databasePath = path.join(__dirname, 'userData.db')
const app = express()
app.use(express.json())
let database = null
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

app.post('/register', async (request, response) => {
  let {username, name, password, gender, location} = request.body //Destructuring the data from the API call
  let hashedPassword = await bcrypt.hash(password, 10) //Hashing the given password
  let checkTheUsername = `
            SELECT *
            FROM user
            WHERE username = '${username}';`
  let userData = await database.get(checkTheUsername) //Getting the user details from the database
  if (userData === undefined) {
    //checks the condition if user is already registered or not in the database
    /*If userData is not present in the database then this condition executes*/
    let postNewUserQuery = `
            INSERT INTO
            user (username,name,password,gender,location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`
    if (password.length < 5) {
      //checking the length of the password
      response.status(400)
      response.send('Password is too short')
    } else {
      /*If password length is greater than 5 then this block will execute*/
      const newUserDetails = await database.run(postNewUserQuery) //Updating data to the database
      newUserDetails.lastID
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    /*If the userData is already registered in the database then this block will execute*/
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  let {username, password} = request.body //Destructuring the data from the API call
  //let hashedPassword = await bcrypt.hash(password, 10)
  let selectTheUsername = `
            SELECT *
            FROM user
            WHERE username = '${username}';`
  let userData = await database.get(selectTheUsername) //Getting the user details from the database
  if (userData === undefined) {
    //checks the condition if user is already exists or not in the database
    /*If userData is not present in the database then this condition executes*/
    response.status(400)
    response.send('Invalid user')
  } else {
    /*If password length is greater than 5 then this block will execute*/
    const isPasswordMatched = await bcrypt.compare(password, userData.password)
    if (isPasswordMatched === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const checkForUserQuery = `
    select * from user where username = "${username}"; `
  const dbUser = await database.get(checkForUserQuery)
  //First we have to know whether the user exists in the database or not
  if (dbUser === undefined) {
    // user not registered
    response.status(400)
    response.send('User not registered')
  } else {
    //check for password
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password)
    if (isValidPassword === true) {
      //check length of new password
      const lengthOfNewPassword = newPassword.length
      if (lengthOfNewPassword < 5) {
        //password is too short response.status(400); response.send("Password is too short");git remote add origin
        response.status(400)
        response.send('Password is too short')
      } else {
        //update password
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatePasswordQuery = `
          update user
          set password= '${encryptedPassword}'
          where username = '${username}'`
        await database.run(updatePasswordQuery)
        response.send('Password updated')
      }
    } else {
      //invalid password.
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
