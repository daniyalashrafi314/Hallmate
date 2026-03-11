from flask import Flask ,redirect,url_for#importing flask

app = Flask(__name__) #creating an instance of the Flask class, which will be our WSGI application. The __name__ variable is passed to the Flask constructor to help it determine the root path of the application.

@app.route("/") #The @app.route("/") decorator is used to specify that the index() function should be called when the root URL ("/") of the application is accessed. This means that when a user visits the homepage of the web application, the index() function will be executed.

def index():
    return "<h1>Hello, World!</h1>" 

@app.route("/hello") #The @app.route("/hello") decorator is used to specify that the hello() function should be called when the "/hello" URL of the application is accessed. This means that when a user visits the "/hello" page of the web application, the hello() function will be executed.
def hello():
    return "Hello, World!" #This function returns a simple HTML string that will be displayed on the webpage when the root URL is accessed.

@app.route("/greet/<name>") #URL processor
def greet(name):
    return f"Hello, {name}!"
@app.route("/number/<int:intNum>")
def shownumber(intNum):
    return "The number is : %d" % intNum

@app.route('/blog/<int:postID>')
def show_blog(postID): 
    return 'Blog Number %d' % postID

@app.route('/admin')
def hello_admin():
    return 'Hello Admin'
@app.route('/guest/<guest>')
def hello_guest(guest):
    return  'Hello %s as guest' % guest

@app.route('/user/<name>')
def hello_user(name):
    if name == 'admin':  # dynamic binding of URL to function
        return redirect(url_for('hello_admin')) #Redirects the route to the route with the function witht that name
    else:
        return redirect(url_for('hello_guest', guest=name))





if __name__ == "__main__": #
    app.run(host='0.0.0.0', debug = True)