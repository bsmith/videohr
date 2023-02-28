# Video Heartrate Thing

This project aims to demonstrate real-time extraction of a person's heart-rate from live video of their face.

[Steve Mould](https://www.youtube.com/@SteveMould) made a [YouTube video](https://www.youtube.com/watch?v=BFZxlauizx0) with [Andrew Steele](https://github.com/ajsteele) demonstrating how small amplitude variations in a video of a face could be amplified to extract heart rate information.  Their code is [available on GitHub](https://github.com/ajsteele/faceHR).

I've based my algorithm on theirs as it's a very simple approach of:

1. chroma key
2. average of selected pixels
3. moving averages

They present their results as exaggerated colours synchronised to their extracted signal.

To this I've added a simple measurement of the heart rate using a simple frequency counting algorithm.

ajsteele's implementation used [python](https://www.python.org/) and [R](https://www.r-project.org/).  My first step was to reimplement this in [Mathematica](https://www.wolfram.com/mathematica/) to understand the algorithm.  (TO FOLLOW: Link to notebook)

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
