import React from 'react';
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import './App.scss';
import Home from "./Home";
import StreamingRoom from "./StreamingRoom";



const App = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route exact path="/r/:roomName" component={StreamingRoom} />
      </Switch>
    </Router>
  );
}

export default App;
