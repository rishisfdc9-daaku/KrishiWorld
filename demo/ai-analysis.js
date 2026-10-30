// KrishiWorld — on-device AI analysis
// Author: Rishi Gullapalli (rishisfdc9-daaku)
//
// Why I built it this way: a farmer's crop photo is private, and a lot of
// farms have patchy signal. So the first real model I wanted in this demo
// runs in the browser itself, not on my server. The photo never leaves the
// page. I use TensorFlow.js + MobileNet because it is a small, well-tested
// general image classifier I can load from a CDN with no build step.
//
// Honest limit, and I want it on the record: MobileNet was trained on
// ImageNet — everyday objects, animals, plants — NOT on crop diseases.
// It can tell me "this looks like a leaf / a plant / corn" with a real
// confidence score, but it cannot by itself say "this is bacterial blight".
// So I treat its output as a provisional, plant-relevance signal and map
// it conservatively (see mapPredictions below). A real disease diagnosis
// needs the fine-tuned model in ai-service/, trained on labelled crop
// photos and validated by agronomists. Until that exists, anything
// uncertain goes to a human agronomist — the same 70% rule as everywhere
// else in KrishiWorld. I would rather escalate too often than guess on a
// farmer's crop.
//
// How it is used: app.js calls analysePhoto(imageElement, crop) and gets
// back an object in the same shape as the old mock diagnosis, plus
// `source` and `predictions`. If the model cannot load (offline, CDN
// blocked, WebGL unavailable), analysePhoto throws, and app.js falls back
// to the clearly labelled mock — it never silently pretends a mock is AI.

(function (global) {
  'use strict';

  var MODEL_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0';
  var MIN_CONFIDENCE = 70; // same threshold as CropIssueService in Apex
  var modelPromise = null;
  var modelFailed = false;

  // Words in ImageNet labels that tell me the photo is plant material.
  // I keep this list small and explicit, because a silent keyword match
  // is exactly the kind of magic I do not want in a farming tool: if a
  // word is added here later, a reviewer should see it and challenge it.
  var PLANT_KEYWORDS = [
    'leaf', 'plant', 'tree', 'flower', 'corn', 'maize', 'broccoli',
    'cauliflower', 'cabbage', 'cucumber', 'zucchini', 'mushroom',
    'potato', 'tomato', 'pepper', 'bean', 'pea', 'lettuce', 'spinach',
    'carrot', 'onion', 'garlic', 'apple', 'banana', 'orange', 'grape',
    'strawberry', 'paddy', 'rice', 'wheat', 'cotton', 'vine', 'grass',
    'bush', 'shrub', 'seedling', 'sprout', 'foliage', 'branch', 'stem'
  ];

  // Provisional mapping, by the crop the farmer picked. This is NOT a
  // disease classifier: it says "a plant photo consistent with this crop
  // was seen, so check these known problem patterns first" — and the
  // resolution steps are the same safe, agronomist-checked generic steps
  // as the rest of the demo. Severity stays Medium at most here, because
  // a general model must never declare a case "High" on its own; High
  // comes from a human or a validated disease model.
  var CROP_GUIDANCE = {
    paddy: {
      checkFirst: 'Bacterial leaf blight pattern — yellowing leaf edges after wet weeks',
      pattern: 'leaf yellowing / water-soaked edges, worse after rain and humidity'
    },
    cotton: {
      checkFirst: 'Bollworm damage pattern — damaged bolls and shedding',
      pattern: 'boll damage after warm, humid nights'
    },
    tomato: {
      checkFirst: 'Early blight pattern — dark leaf spots',
      pattern: 'dark spots on older leaves, spreading after rain'
    },
    maize: {
      checkFirst: 'Nutrient stress pattern — pale lower leaves',
      pattern: 'pale or yellowing lower leaves, slow growth'
    }
  };

  function isPlantLabel(label) {
    var lower = String(label || '').toLowerCase();
    return PLANT_KEYWORDS.some(function (word) {
      return lower.indexOf(word) !== -1;
    });
  }

  function loadModel() {
    // Load once, reuse for every photo. If it fails, remember the failure
    // so we do not hammer the CDN on every click — the fallback is the
    // honest answer when offline.
    if (modelPromise) return modelPromise;
    if (typeof global.tf === 'undefined' || typeof global.mobilenet === 'undefined') {
      modelFailed = true;
      return Promise.reject(new Error('TensorFlow.js / MobileNet scripts did not load (offline or CDN blocked).'));
    }
    modelPromise = global.mobilenet.load({ version: 2, alpha: 1.0 })
      .catch(function (err) {
        modelFailed = true;
        modelPromise = null;
        throw err;
      });
    return modelPromise;
  }

  function mapPredictions(predictions, crop) {
    // predictions: [{className, probability}] from MobileNet, sorted best-first.
    var top = predictions && predictions[0];
    if (!top) {
      return {
        problem: 'No clear image result — needs agronomist review',
        confidence: 0, severity: 'High',
        why: 'The on-device model returned no prediction for this photo. I will not guess from an empty result.',
        escalate: true
      };
    }
    var confidence = Math.round(top.probability * 100);
    var plantPredictions = predictions.filter(function (p) { return isPlantLabel(p.className); });
    var plantScore = plantPredictions.length
      ? Math.round(Math.max.apply(null, plantPredictions.map(function (p) { return p.probability; })) * 100)
      : 0;
    var guidance = CROP_GUIDANCE[crop] || CROP_GUIDANCE.paddy;

    if (plantScore === 0) {
      // The model is fairly sure this is NOT a plant. That is useful
      // information, but it is not a diagnosis — it usually means a blurry
      // photo, a hand, or the wrong subject. Ask for a better photo and
      // escalate rather than forcing a crop answer onto a non-crop photo.
      return {
        problem: 'Photo does not clearly show a crop — needs a retake / agronomist review',
        confidence: confidence, severity: 'High',
        why: 'Top on-device prediction was "' + top.className + '" (' + confidence + '%), which is not plant material. ' +
          'Please retake a clear, close photo of the affected leaves, in daylight.',
        escalate: true
      };
    }

    if (confidence < MIN_CONFIDENCE || plantScore < MIN_CONFIDENCE) {
      return {
        problem: 'Uncertain plant photo — needs agronomist review',
        confidence: Math.min(confidence, plantScore), severity: 'High',
        why: 'The model saw plant material (best plant match ' + plantScore + '%) but was not confident enough ' +
          'to rely on. Below ' + MIN_CONFIDENCE + '% I escalate instead of guessing.',
        escalate: true
      };
    }

    // Confident plant photo: provisional, crop-specific guidance.
    // I say "check first" deliberately — this is a starting point for the
    // farmer and the agronomist, not a confirmed disease name.
    return {
      problem: 'Plant photo consistent with ' + crop + ' — check first: ' + guidance.checkFirst,
      confidence: plantScore, severity: 'Medium',
      why: 'On-device model saw "' + top.className + '" (' + confidence + '%) and plant material at ' +
        plantScore + '%. Known pattern to check first for ' + crop + ': ' + guidance.pattern + '. ' +
        'This is a general image model, not a trained crop-disease model — confirm with an agronomist before spraying.',
      escalate: false
    };
  }

  function analysePhoto(imageElement, crop) {
    if (!imageElement || !imageElement.src) {
      return Promise.reject(new Error('No photo available to analyse.'));
    }
    return loadModel().then(function (model) {
      // MobileNet classify() needs a fully loaded image. If the preview
      // is still decoding, wait for it rather than classifying a blank frame.
      var ready = imageElement.complete && imageElement.naturalWidth > 0
        ? Promise.resolve()
        : new Promise(function (resolve, reject) {
            imageElement.onload = resolve;
            imageElement.onerror = function () { reject(new Error('Photo could not be loaded for analysis.')); };
          });
      return ready.then(function () { return model.classify(imageElement); });
    }).then(function (predictions) {
      var mapped = mapPredictions(predictions, crop);
      return {
        problem: mapped.problem,
        confidence: mapped.confidence,
        severity: mapped.severity,
        why: mapped.why,
        escalate: mapped.escalate,
        source: 'on-device-ai',
        model: 'MobileNet v2 (TensorFlow.js, ImageNet) — general classifier, not a crop-disease model',
        predictions: predictions.slice(0, 3).map(function (p) {
          return { label: p.className, confidence: Math.round(p.probability * 100) };
        })
      };
    });
  }

  function status() {
    return { loaded: !!modelPromise && !modelFailed, failed: modelFailed };
  }

  global.AIAnalysis = {
    analysePhoto: analysePhoto,
    mapPredictions: mapPredictions,
    loadModel: loadModel,
    status: status,
    MIN_CONFIDENCE: MIN_CONFIDENCE
  };
})(typeof window !== 'undefined' ? window : this);
