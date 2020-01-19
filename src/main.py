from flask import Flask, request, render_template, make_response, jsonify, redirect
import configparser
import os
import datetime

APP_ROOT = os.path.dirname(os.path.abspath(__file__))   # refers to application_top
APP_VERSION=1.3
COOKIE_NAME = "afe-token"
COOKIE_EXPIRES_DAYS = 180
app = Flask(__name__)
 
@app.route("/")
def home():
    user = request.headers.get('X-Remote-User')
    token = request.cookies.get(COOKIE_NAME)
    if token == None:
        return redirect("/setup")
    else:
        return render_template("main.html", title='Edit', user=user, token=token, version=APP_VERSION)
 
 # Setup page (if the token cookie is not set)
@app.route("/setup", methods=['GET', 'POST'])
def login():
    # Fetch the token from a cookie
    token = request.cookies.get(COOKIE_NAME)
    if token == None:
        token = ''
    if request.method == 'POST':
        token = request.form.get('token')
        res = make_response(render_template("setup.html", title='Setup', token=token, version=APP_VERSION))
        expire_date = datetime.datetime.now()
        expire_date = expire_date + datetime.timedelta(days=COOKIE_EXPIRES_DAYS)
        res.set_cookie(COOKIE_NAME, value=token, expires=expire_date)
        return(res)
    else:
        return render_template("setup.html", title='Setup', token=token, version=APP_VERSION)

 # Rest service for fetching the configuration (think in multiple configurations)
 # perhaps as a URL parameter or cookie set on the login page
@app.route("/config")
def config():
    configParser = configparser.RawConfigParser()   
    configFilePath = os.path.join(APP_ROOT,'config.properties')
    print("Looking for config.properties file at: {}".format(configFilePath))
    configParser.read(configFilePath)
    config = {
        "github": {
            "url": configParser.get('github', 'url'),
            "branch": configParser.get('github', 'branch')
        },
        "images": {
            "url": configParser.get('images', 'url')
        }
    }
    return jsonify(config)

#if __name__ == "main":
#    app.run()