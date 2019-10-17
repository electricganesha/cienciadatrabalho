var express = require('express');
var router = express.Router();
var Question = require('../server/models/Question');
var Vandalytic = require('../server/models/Vandalytic');
var QRCode = require('qrcode');
var PDFDocument = require('pdfkit');
var fs = require("fs");
var blobStream = require('blob-stream');
var streamBuffers = require('stream-buffers');
var base64 = require('base64-stream');


// set a cookie to requested locale
router.get('/setlocale/:locale', function (req, res) {
  res.setLocale(req.params.locale);
  res.cookie('locale', req.params.locale);
  res.redirect('back');
});

router.get('/', function (req, res) {

  var randomStory = "/uploads/stories/defaultStory1.html";

  registerVisitor(req, res, "landing");

  var random = Math.floor(Math.random() * 6) + 1;

  switch (random) {
    case (1):
      randomStory = "/uploads/stories/ANNA.html";
      break;
    case (2):
      randomStory = "/uploads/stories/CHRISTIAN.html";
      break;
    case (3):
      randomStory = "/uploads/stories/FELIPE.html";
      break;
    case (4):
      randomStory = "/uploads/stories/NATALIA.html";
      break;
    case (5):
      randomStory = "/uploads/stories/PEDRO.html";
      break;
    case (6):
      randomStory = "/uploads/stories/TIAGO.html";
      break;
  }


  res.render('landing', {
    id: '',
    title: '#ciênciadátrabalho',
    question: 'Eu Tenho Perguntas?',
    teaser: 'A comunicar ciência através do vandalismo investigativo.',
    story: randomStory,
    calltoaction: "Se queres saber mais sobre o movimento, entra nesta estória!"
  });
});

/* GET manifesto page */
router.get('/manifesto', function (req, res) {
  registerVisitor(req, res, "manifesto");
  res.render('manifesto', {
    title: '#ciênciadátrabalho - Manifesto'
  });
});

/* GET how-to page */
router.get('/howto', function (req, res) {
  registerVisitor(req, res, "howto");
  res.render('howto', {
    title: '#ciênciadátrabalho - Como Participar'
  });
});

/* GET new question page */
router.get('/new', function (req, res) {
  res.render('new', {
    title: '#ciênciadátrabalho - Nova Pergunta'
  });
});

/* GET analytics page */
router.get('/vandalytics', function (req, res) {

  Vandalytic.find().exec(function (err, results) {

    var maxCount = 0;

    for (var i = 0; i < results.length; i++) {
      if (results[i].count > maxCount)
        maxCount = results[i].count;

      if (i == results.length - 1) {
        res.render('vandalytics', {
          title: '#ciênciadátrabalho - Vandalytics',
          vandalytics: results,
          maxCount: maxCount,
          _id: "",
        });
      }
    }


  });
});

/* GET analytics page */
router.get('/vandalyticsdata', function (req, res) {

  Vandalytic.find().exec(function (err, results) {

    res.send(results);
  });


});

/* GET gallery page */
router.get('/gallery', function (req, res) {
  registerVisitor(req, res, "gallery");
  Question.find({"isApproved":true}).exec(function (err, docs) {

    if (err) {
      res.render('error', {
        message: "Something bad happened to your gallery",
        status: err
      });
    } else {
      res.render('gallery', {
        title: '#ciênciadátrabalho - Galeria',
        docs: docs,
        id: ''
      });
    }
  });
});

router.post('/generatePoster', function (req, res) {

  registerVisitor(req, res, "poster");
  
  var doc = new PDFDocument();

  var finalString = '';

  var stream = doc.pipe(base64.encode());

  var question = req.body.question;

  var splitQuestion = question.split(" ");

  var hashtag = req.__('title');

  /*
  * Control for small words to be put in the same line
  */
  for(var i=0; i< splitQuestion.length; i++)
  {
    if (splitQuestion[i].length <= 3) {
      var tempString = splitQuestion[i];

      if(i > 0)
      {
        splitQuestion[i - 1] = splitQuestion[i-1]+ " " + tempString;

        splitQuestion.splice(i, 1);
      }
      else
      {
        splitQuestion[i + 1] = tempString+ " " + splitQuestion[i+1];

        splitQuestion.splice(i, 1);
      }
      
    }
  }

  /*
  * Control for font size depending on word length
  */
  for (var i = 0; i < splitQuestion.length; i++) {

    doc.polygon([10, 10], [10, 780], [600, 780], [600, 10]).dash(10, 20).stroke();

    var fontSize = 0;
    if (splitQuestion[i].length <= 5)
      fontSize = 96;
    else if (splitQuestion[i].length <= 10)
      fontSize = 64;
    else
      fontSize = 48;

    if (i < splitQuestion.length - 1) {
      doc.font('public/fonts/Bungee.ttf', fontSize).text(splitQuestion[i], {
        align: 'center',
      });
    } else {
      doc.font('public/fonts/Bungee.ttf', fontSize).text(splitQuestion[i], {
        align: 'center',
      }).moveDown();
    }

  }


  /*
   * Generate QR Code for this question
   */
  QRCode.toDataURL("http://cienciadatrabalho.info/"+req.body.id, function (err, qrCode) {

    doc.image((new Buffer(qrCode.replace('data:image/png;base64,', ''), 'base64')), 230, 500, {
      align: 'center',
    }); // this will decode your base64 to a new buffer

    doc.font('public/fonts/Lora.ttf', 36).text(hashtag, 70, 670, {
      align: 'center',
    });


    doc.end();

    stream.on('data', function (chunk) {
      finalString += chunk;
    });

    stream.on('end', function () {
      // the stream is at its end, so push the resulting base64 string to the response
      res.json(finalString);
    });


  });

});

/* GET home page with a specific ID */
router.get('/:id', function (req, res) {
  registerVisitor(req, res, "landing/" + req.params.id);
  getQuestionById(req, res);

});

/* GET detail page related with a specific ID */
router.get('/:id/detail', function (req, res) {
  registerVisitor(req, res, "landing/" + req.params.id + "/detail");
  Question.findById(req.params.id, function (err, questions) {

    if (err) {
      res.send(err);
    }

    if (questions == null) {
      res.render('error', {
        status: 404,
        message: 'not found',
        error: '404 not found'
      });
    }


    res.render('detail', {
      title: '#ciênciadátrabalho',
      detail: questions.details
    });

  });


});

/* POST a new question */
router.post('/question', function (req, res) {
  registerVisitor(req, res, "newquestion");
  var newQuestion = new Question();
  newQuestion.question = req.body.question;
  newQuestion.answer = req.body.answer;
  newQuestion.created_at = new Date();
  newQuestion.interactiveStory = req.body.interactiveStory;
  newQuestion.poster = req.body.poster;
  newQuestion.details = req.body.details;
  newQuestion.isApproved = false;

  newQuestion.save(function (err, newQuestion) {
    if (err) res.send(err);
    console.log(err);
    res.json(newQuestion);
  });

});

/* POST a new visit */
var registerVisitor = function (req, res, page) {

  Vandalytic.find({
    'page': page
  }).exec(function (err, results) {

    var vandalytics = [];

    if (results.length > 0) {
      var vandalytic = results[0];

      vandalytic.timestamps.push(Date.now());
      vandalytic.count++;

      vandalytic.save(function (err, newVandalytic) {
        console.log("saved existing vandalytic to db");
      });
    } else {
      var newVandalytic = new Vandalytic();
      newVandalytic.page = page;
      newVandalytic.timestamps.push(Date.now());
      newVandalytic.count++;

      newVandalytic.save(function (err, newVandalytic) {
        console.log("saved new vandalytic to db");
      });
    }
  });
};


var getQuestionById = function (req, res) {

  var qrCode = '';

  Question.findById(req.params.id, function (err, questions) {

    if (err) {
      res.send(err);
    }

    if (questions == null) {
      res.render('error', {
        status: 404,
        message: 'not found',
        error: '404 not found'
      });
    }

    if (req.params.id) {
      QRCode.toDataURL("http://cienciadatrabalho.info" + req.params.id, function (err, url) {
        qrCode = url;
        res.render('landing', {
          id: req.params.id,
          title: '#ciênciadátrabalho',
          question: questions.question,
          teaser: questions.answer,
          story: questions.interactiveStory,
          qrCode: qrCode,
          calltoaction: "Se queres saber mais sobre a ciência por trás desta pergunta, entra nesta estória!"
        });
      });
    } else {
      res.render('landing', {
        id: '',
        title: '#ciênciadátrabalho',
        question: 'Eu Tenho Perguntas?',
        teaser: '#ciênciadátrabalho é um movimento que surge no contexto do Emergence Hackathon 2018, e pretende despertar a consciência do público para a complexidade e morosidade do trabalho científico através do casamento entre a arte de rua e o mundo digital. Entra na nossa história.',
        story: '/uploads/stories/TESTE.html',
        calltoaction: "Se queres saber mais sobre a ciência por trás desta pergunta, entra nesta estória!"
      });
    }

  });
}

module.exports = router;
