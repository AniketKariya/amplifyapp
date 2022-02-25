import React, { useState, useEffect } from "react";
import './App.css';

import { Amplify, API, graphqlOperation, Storage } from "aws-amplify";
import { createTodo, deleteTodo as deleteTodoMutation } from "./graphql/mutations";
import { listTodos } from "./graphql/queries";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import awsExports from "./aws-exports";
Amplify.configure(awsExports);

const initialState = { name: "", description: "" };

function App({ signOut, user }) {
  const [formState, setFormState] = useState(initialState);
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    fetchTodos();
  }, [])

  function setInput(key, value) {
    setFormState({ ...formState, [key]: value })
  }

  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormState({ ...formState, image: file.name });
    await Storage.put(file.name, file);
    fetchTodos();
  }

  async function fetchTodos() {
    try {
      const todoData = await API.graphql(graphqlOperation(listTodos))
      const todos = todoData.data.listTodos.items;
      await Promise.all(todos.map(async todo => {
        if (todo.image) {
          const image = await Storage.get(todo.image);
          todo.image = image;
          console.log(image)
        }
        return todo;
      }))
      setTodos(todos);
    } catch (err) {
      console.log("error fetching todos");
    }
  }

  async function addTodo() {
    try {
      if (!formState.name || !formState.description) return
      const newTodo = await API.graphql(graphqlOperation(createTodo, { input: formState }))
      if (formState.image) {
        const image = await Storage.get(formState.image)
        formState.image = image;
      }
      setTodos([...todos, newTodo.data.createTodo]);
      setFormState(initialState);

    } catch (err) {
      console.log("error creating todo: ", err);
    }
  }

  async function deleteTodo({ id }) {
    const newTodosArray = todos.filter(todo => todo.id !== id);
    console.log(id);
    console.log(newTodosArray);
    setTodos(newTodosArray);
    await API.graphql({ query: deleteTodoMutation, variables: { input: { id } } });
  }

  return (
    <div style={styles.container}>
      <h1>Hello {user.username}</h1>
      <button style={styles.button} onClick={signOut}>Sign out</button>
      <br />
      <h2>Amplify Todos</h2>
      <input
        onChange={event => setInput('name', event.target.value)}
        style={styles.input}
        value={formState.name}
        placeholder="Name"
      />
      <input
        onChange={event => setInput('description', event.target.value)}
        style={styles.input}
        value={formState.description}
        placeholder="Description"
      />
      <input
        type="file"
        onChange={onChange}
      />
      <button style={styles.button} onClick={addTodo}>Create Todo</button>
      {
        todos.map((todo, index) => (
          <div key={todo.id ? todo.id : todo.name} style={styles.todo}>
            <p style={styles.todoName}>{todo.name}</p>
            <p style={styles.todoDescription}>{todo.description}</p>
            <button onClick={() => deleteTodo(todo)}> Delete Todo </button>
            {
              todo.image && <img src={todo.image} style={{width: 400}} />
            }
          </div>
        ))
      }
    </div>
  );
}

const styles = {
  container: { width: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 },
  todo: { marginBottom: 15 },
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18 },
  todoName: { fontSize: 20, fontWeight: 'bold' },
  todoDescription: { marginBottom: 0 },
  button: { backgroundColor: 'black', color: 'white', outline: 'none', fontSize: 18, padding: '12px 0px' }
}

export default withAuthenticator(App);
