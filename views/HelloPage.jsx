var React = require('react');
var ReactDOMServer = require('react-dom/server');

var ListItem = require('./core/ListItem');

export default class HelloPage extends React.Component {
  render() {
    var contentHtml = ReactDOMServer.renderToString(<ListItem />);

    //return <div>Hello {this.props.name}</div>;
    return <div>{{__html: contentHtml}}</div>;
  }
}
