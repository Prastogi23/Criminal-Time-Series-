from flask import Flask , render_template
import joblib
from prophet import Prophet
from flask import request, redirect,Response , url_for , jsonify
import pandas as pd 
from datetime import timedelta
app = Flask(__name__)

models={}
                    
models["BATTERY - SIMPLE ASSAULT"] = joblib.load('./models/Prophet BATTERY - SIMPLE ASSAULT.pkl')
print("Prophet BATTERY - SIMPLE ASSAULT loaded successfully.")

models["BURGLARY FROM VEHICLE"] = joblib.load('./models/Prophet BURGLARY FROM VEHICLE.pkl')
print("Prophet BURGLARY FROM VEHICLE loaded successfully.")


models["THEFT OF IDENTITY"] = joblib.load('./models/Prophet THEFT OF IDENTITY.pkl')
print("Prophet THEFT OF IDENTITY loaded successfully.")


models["VANDALISM - FELONY ($400 & OVER, ALL CHURCH VANDALISMS)"] = joblib.load('./models/Prophet VANDALISM - FELONY ($400 & OVER, ALL CHURCH VANDALISMS).pkl')
print("Prophet VANDALISM - FELONY ($400 & OVER, ALL CHURCH VANDALISMS) loaded successfully.")


models["VEHICLE - STOLEN"] = joblib.load('./models/Prophet VEHICLE - STOLEN.pkl')
print("Prophet VEHICLE - STOLEN loaded successfully.")



def predict_y_for_date(model, target_date):
    """
    Predict the 'y' value for a given target date using the trained Prophet model.

    Parameters:
    - model: Trained Prophet model.
    - target_date: Date for which to predict the 'y' value. (str or datetime)

    Returns:
    - Predicted 'y' value for the given date.
    """
    # Ensure the target_date is in the correct format (datetime)
    target_date = pd.to_datetime(target_date)

    # Create a DataFrame with the target date (ds)
    future = pd.DataFrame({'ds': [target_date]})

    # Predict the y value for the target date
    forecast = model.predict(future)

    # Extract and return the predicted y value
    predicted_y = forecast['yhat'].values[0]
    return round(predicted_y,2)


def predict_y_for_date_range(model, start_date, end_date):
    """
    Predict the 'y' value for all dates between the start and end date using the trained Prophet model.

    Parameters:
    - model: Trained Prophet model.
    - start_date: Start date for the range (str or datetime).
    - end_date: End date for the range (str or datetime).

    Returns:
    - A dictionary with dates as keys and predicted 'y' values as values.
    """
    # Ensure both start_date and end_date are in the correct datetime format
    start_date = pd.to_datetime(start_date)
    end_date = pd.to_datetime(end_date)
    
    # Create a list of all dates between start_date and end_date
    date_range = pd.date_range(start=start_date, end=end_date).strftime('%Y-%m-%d')
    
    # Create a DataFrame with all the dates (ds)
    future_dates = pd.DataFrame({'ds': date_range})

    # Predict 'y' values for all dates in the range
    forecast = model.predict(future_dates)
    
    # Extract the predicted 'yhat' values and return them in a dictionary
    predictions = {date: round(forecast.loc[forecast['ds'] == date, 'yhat'].values[0], 2)
                   for date in date_range}
    
    return predictions


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/about/")
def about():
    return render_template("about.html")

@app.route("/insights/")
def insights():
    return render_template("insights.html")


@app.route("/predict/")
def predict():
    return render_template("predict.html")

@app.route("/contact/")
def contact():
    return render_template("contact.html")


@app.route('/api/predict_single_date', methods=['POST'])
def predict_single_date():
    # Get the incoming JSON data
    data = request.get_json()

    # Extract date and classes from the data
    date = data.get('date')
    classes = data.get('classes')

    response_data = {}
    for cls in classes:
        response_data[cls] = predict_y_for_date(models[cls],date)

    # Create the final response format
    response = {
        "Status": 200,
        "data": {
            "totalCrimes": response_data
        }  }

    return jsonify(response)

@app.route('/api/predict_date_range', methods=['POST'])
def predict_date_range():
    # Get the incoming JSON data
    data = request.get_json()

    # Extract start_date, end_date, and classes from the data
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    classes = data.get('classes')

    response_data = {}
    for cls in classes:
        response_data[cls] = predict_y_for_date_range(models[cls], start_date, end_date)

    # Create the final response format
    response = {
        "Status": 200,
        "data": {
            "totalCrimes": response_data
        }
    }

    return jsonify(response)

if __name__ == "__main__":
  app.run(host = '0.0.0.0',debug = True,port = 8080) 









