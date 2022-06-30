const express = require("express");
const app = express();
const mongoose = require("mongoose");
const moment = require("moment-jalaali");
const mongoXlsx = require("mongo-xlsx");
const open = require("open");

//-- Express Config
app.set("view engine", "ejs");
app.use("/", express.static("public"));
app.use(express.urlencoded({
    extended: true
}));
mongoose.connect("mongodb://localhost:27017/idealand", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

//-- Mongoose Models
const categorySchema = new mongoose.Schema({
    category_code: Number,
    category_priority: Number,
    category_title: String
});
const Category = mongoose.model("category", categorySchema);
const ideaSchema = new mongoose.Schema({
    idea_id: Number,
    idea_category_code: Number,
    idea_content: String,
    idea_is_important: Boolean,
    idea_last_modified_time: Number
});
const Idea = mongoose.model("idea", ideaSchema);

//-- Express Routes
app.get("/", function(req, res){
    Category.find(null, null, {
        sort: {category_priority: 1}
    }, function(err, allCategories){

        Idea.find(null, null, {
            sort: {idea_content: 1}
        }, function(err, allIdeas){

            let ideasObjCol1 = {};
            let ideasObjCol2 = {};
            let ideasObjCol3 = {};

            let categoriesKeyValue = {};
            let tempCounter = 0;
            allCategories.forEach(function(item){
                switch(tempCounter % 3){
                    case 0:
                        ideasObjCol1[item.category_title] = [];
                        tempCounter++;
                        break;
                    case 1:
                        ideasObjCol2[item.category_title] = [];
                        tempCounter++;
                        break;
                    case 2:
                        ideasObjCol3[item.category_title] = [];
                        tempCounter++;
                        break;
                }
                categoriesKeyValue[item.category_code] = item.category_title;
            });

            allIdeas.forEach(function(item2){
                if(ideasObjCol1[categoriesKeyValue[item2.idea_category_code]]){
                    ideasObjCol1[categoriesKeyValue[item2.idea_category_code]].push({
                        title: item2.idea_content,
                        code: item2.idea_id,
                        important: item2.idea_is_important
                    });
                }else if(ideasObjCol2[categoriesKeyValue[item2.idea_category_code]]){
                    ideasObjCol2[categoriesKeyValue[item2.idea_category_code]].push({
                        title: item2.idea_content,
                        code: item2.idea_id,
                        important: item2.idea_is_important
                    });
                }else{
                    ideasObjCol3[categoriesKeyValue[item2.idea_category_code]].push({
                        title: item2.idea_content,
                        code: item2.idea_id,
                        important: item2.idea_is_important
                    });
                }
            });

            console.log(ideasObjCol2);

            renderEjs(res, "index", {
                allCategories: allCategories,
                ideasObjCol1: ideasObjCol1,
                ideasObjCol2: ideasObjCol2,
                ideasObjCol3: ideasObjCol3
            });
        });

    });
});

app.post("/addidea", function(req, res){
    Idea.findOne({
        $and: [
            {idea_category_code: req.body.category},
            {idea_content: req.body.content}
        ]
    }, function(err, foundIdea){
        if(!foundIdea){
            let epochNow = new Date().getTime();
            const idea = new Idea({
                idea_id: epochNow,
                idea_category_code: req.body.category,
                idea_content: req.body.content,
                idea_is_important: req.body.important ? true : false,
                idea_last_modified_time: epochNow
            });
            idea.save(function(err2){
                res.redirect("/");
            });
        }else{
            renderEjs(res, "error", {
                errorMsg: "چنین ایده‌ای در این دسته قبلا ثبت شده است."
            });
        }
    });
});

app.get("/categories", function(req, res){
    Category.find(null, null, {
        sort: {category_priority: 1}
    }, function(err, allCategories){
        renderEjs(res, "categories", {
            allCategories: allCategories
        });
    });
});

app.get("/addcategory", function(req, res){
    renderEjs(res, "addcategory", {});
});

app.post("/addcategory", function(req, res){
    Category.countDocuments(null, function(err, categoryCount){
        const category = new Category({
            category_code: categoryCount + 1,
            category_priority: req.body.priority,
            category_title: req.body.title
        });
        category.save(function(err2){
            res.redirect("/categories");
        });
    });
});

app.get("/editcategory", function(req, res){
    if(!req.query.code){
        renderEjs(res, "error", {
            errorMsg: "وارد کردن کد دسته الزامی است."
        });
    }else{
        Category.findOne({category_code: req.query.code}, function(err, foundCategory){
            if(!foundCategory){
                renderEjs(res, "error", {
                    errorMsg: "دسته‌ای با این کد یافت نشد."
                });
            }else{
                renderEjs(res, "editcategory", {
                    foundCategory: foundCategory
                });
            }
        });
    }
});

app.post("/editcategory", function(req, res){
    if(!req.query.code){
        renderEjs(res, "error", {
            errorMsg: "وارد کردن کد دسته الزامی است."
        });
    }else{
        Category.findOne({category_code: req.query.code}, function(err, foundCategory){
            if(!foundCategory){
                renderEjs(res, "error", {
                    errorMsg: "دسته‌ای با این کد یافت نشد."
                });
            }else{
                Category.updateOne({category_code: req.query.code}, {
                    $set: {
                        category_priority: req.body.priority,
                        category_title: req.body.title
                    }
                }, function(err2){
                    res.redirect("/categories");
                });
            }
        });
    }
});










app.get("*", function(req, res){
    renderEjs(res, "error", {
        errorMsg: "ارور 404: یافت نشد."
    });
});

function renderEjs(functionRes, functionView, functionAdditionalObj){
    Category.countDocuments(null, function(err1, categoryCount){
        Idea.countDocuments(null, function(err2, ideaCount){
            let stats = {
                categoryCount: categoryCount,
                ideaCount: ideaCount
            }

            let mergedObj = Object.assign({},
                stats,
                functionAdditionalObj
            );
            functionRes.render(functionView, mergedObj);
        });
    });
}

//-- Server Initialization
const runningPort = 5823;
app.listen(runningPort, function(){
    console.log("The app is now running on port " + runningPort);
    open("http://localhost:" + runningPort);
});