// NeuroLibre submission with GitHub and GMail integration.
// This script is associated with the following:
//      - A Google Form (NeuroLibre submisison)
//      - A Google Spreadheet as the response destination
//      - A GitHub repository (repo scoped access token is required)
//      - A GMail account (ideally belongs to a bot)
// -------------------------------------------------------------------------
// OAuth SCOPES
// -------------------------------------------------------------------------
// OAuth Scopes required by this script are given in the appscript.json file
// located at NeuroLibre's submit repo (neurolibre/submit/.google).
//      - This file is not visible by default in the project tab. To
//      make it visible, View --> Show manifest file.
//      - After you copy the content of NeuroLibre's appscript.json, make sure
//      that the OAuth scopes are listed in (File-->Project Properties-->Scopes).
// -------------------------------------------------------------------------
// TRIGGER
// -------------------------------------------------------------------------
// This project's triggger (Edit-->Current Project's trigger) must have the
// following configuration:
//      - Function to run: dispatchToNeuroLibre
//      - Runs at deployment: Head
//      - Event source: From spreadsheet
//      - Event type: On form submit
// -------------------------------------------------------------------------
// API CALLS
// -------------------------------------------------------------------------
// This script uses GitHub REST API (v3 as of May 2020) to:
//      - Open an issue on the target repository on form submission (POST)
//      - Fetch issue number and lock the conversation (PUT)
//      - TODO: Why do we lock the conversation?
// Please make sure that the API calls are up to date with the resources
// described by GitHub: https://docs.github.com/.
// -------------------------------------------------------------------------
// VARIABLE NAMING CONVENTIONS
// -------------------------------------------------------------------------
// To distinguish user-provided global variables from those declared by the script:
//
// i  -  Global variables provided by form submission are stored in formValues
//       object returned by getFormValues function. All the fieldnames in formValues
//       object are CAPITALIZED.
//       - var formValues = getFormValues();
//          - formValues.AUTHOR_EMAIL, formValues.AUTHOR_NAME ... etc.
//
// ii  - Global variables declared by the script follow camelCase. These variables
//       are intended for easing access to the auxiliary information. List of global
//       variable declared by this script are:
//          - mapVal, icon*, logo*, header*, footer*
//
// iii - Global variables specifying GitHub repository to which authorized
//       API calls will point (e.g. neurolibre/submit) are CAPITALIZED.
//          - HANDLE, REPO, TOKEN
//
// iv - Local variables follow snake_case.
//
// -------------------------------------------------------------------------
// FUNCTION NAMING CONVENTIONS
// -------------------------------------------------------------------------
// i- All the function names follow camelCase.
// -------------------------------------------------------------------------
// Author: Agah Karakuzu | 2020
//         agahkarakuzu@gmail.com, Polytechnique Montreal
//         GitHub: @agahkarakuzu
// -------------------------------------------------------------------------

// ---------------------------------------------------------------------
// DEFINE GLOBAL VARIABLES FOR GITHUB & GOOGLE SHEETS
// #####################################################################  START

// GitHub Handle (organization or person)
var HANDLE = "roboneurotest";

// Target GitHub repository (handle/repo)
var REPO = "submit";

// GitHub Token (of a dev who has write access to the repo)
// This is visible on the script.google.com project
var TOKEN = "REDACTED";

// Note that the variable passed to the scope of this project
// contains form responses in `.values` field with this mapping between
// the column names and the indexes: (A,B,C.. --> 0,1,2...).

// The following object literal maps the spreadsheet column indexes to
// the respective fields.

var mapVal = {
  "author_email": 1,
  "author_name": 3,
  "author_github": 4,
  "publication_title": 5,
  "publication_type": 6,
  "article_url": 7,
  "repo_url":8
};


// ##################################################################### END

// ---------------------------------------------------------------------
// Global vars for icons and images
// ##################################################################### START
var iconGithub = "https://cdn2.iconfinder.com/data/icons/black-white-social-media/64/github_social_media_logo-512.png";
var iconTwitter = "https://cdn2.iconfinder.com/data/icons/black-white-social-media/32/online_social_media_twitter-512.png";
var iconDev = "https://cdn1.iconfinder.com/data/icons/badges-achievements-001-solid/68/Artboard_8-512.png";
var iconWebsite = "https://cdn3.iconfinder.com/data/icons/black-white-social-media/32/www_logo_social_media-512.png";
var logoNeurolibreOutline = "https://github.com/neurolibre/neurolibre.com/blob/master/static/img/favicon.png?raw=true";
var logoNeurolibre = "https://raw.githubusercontent.com/neurolibre/docs.neurolibre.com/master/source/img/logo_neurolibre_old.png";
var footerPublication = "https://github.com/roboneurotest/submit/blob/master/images/publication_footer.png?raw=true";
var iconReview = "https://cdn0.iconfinder.com/data/icons/job-seeker/256/conversation_job_seeker_employee_unemployee_work-512.png";
var footerTutorial = "https://github.com/roboneurotest/submit/blob/master/images/tutorial_footer.png?raw=true";
// #####################################################################  END

// ---------------------------------------------------------------------
// Global vars for HTML template
// ##################################################################### START
var header =  "<div style=\"background-color:red;padding:3px;border-radius:15px;\">" +
    "<center><img src=\"" +  logoNeurolibre + "\" height=\"100px\"></img>" +
    "<h2 style=\"margin-top:0! important;color:white;margin-bottom:0! important;font-family: Arial, Helvetica, sans-serif;font-weight:100;\">NeuroLibre</h2></center>" +
    "</div>";

var footer =
    "<div style=\"background-color:#333;height:70px;border-radius:10px;\">" +
    "<p><img src=\"" + logoNeurolibreOutline + "\" height=\"70px\" style=\"float:left;\"></p>" +
    "<p><a href=\"https://twitter.com/neurolibre?lang=en\"><img style=\"height:45px;margin-right:10px;float:right;margin-top:12px;\" src=\"" + iconTwitter + "\"></a></p>" +
    "<a href=\"https://github.com/neurolibre\"><img style=\"height:45px;margin-right:10px;float:right;margin-top:12px;\" src=\"" + iconGithub + "\"></a>" +
    "<a href=\"https://neurolibre.com\"><img style=\"height:45px;margin-right:10px;float:right;margin-top:12px;\" src=\"" + iconWebsite + "\"></a>" +
    "</p></div>";
// #####################################################################  END

// ---------------------------------------------------------------------
// ENTRY FUNCTION
function dispatchToNeuroLibre(fromForm)
{

   var sanity_response;
   var formValues;
  // Use the Properties Service to declare persistent global variables
  // These properties will be broadcasted to the global scope.
  // Please see declarations at the below of this function.
  var script_properties = PropertiesService.getScriptProperties();

  script_properties .setProperty('author_email', fromForm.values[mapVal.author_email]);
  script_properties .setProperty('author_name', fromForm.values[mapVal.author_name]);
  script_properties .setProperty('author_github', fromForm.values[mapVal.author_github]);
  script_properties .setProperty('publication_title', fromForm.values[mapVal.publication_title]);
  script_properties .setProperty('publication_type', fromForm.values[mapVal.publication_type]);
  script_properties .setProperty('article_url', fromForm.values[mapVal.article_url]);
  script_properties .setProperty('repo_url', fromForm.values[mapVal.repo_url]);

  // Call main function if the sanityCheck is successful.
  sanity_response = sanityCheck(fromForm.values[mapVal.author_github],fromForm.values[mapVal.author_email], fromForm.values[mapVal.repo_url]);

  if (sanity_response.valid){

    script_properties.setProperty('repo_owner', sanity_response.owner);
    script_properties.setProperty('repo_name',  sanity_response.repo_name);

    // GET ALL THE FORM VALUES
    formValues = getFormValues();

    runSubmissionWorkflow(formValues);

    // Delete all the properties in the current Properties store.
    script_properties.deleteAllProperties();

}else{

    Logger.log("The submission did not meet the requirements or not in allowed list. " +
               "An email has been sent to the submitter.");

  }

}
// ENTRY FUNCTION ------------------------------------------------------ END

// Expose persistent variables in PropertiesService to the global scope
// These are the values provided upon form submission and are not submitted
// to change. Therefore suitable for global scope.
function getFormValues(){

var script_properties = PropertiesService.getScriptProperties();

var formValues = {
    "AUTHOR_EMAIL": script_properties.getProperty('author_email'),
    "AUTHOR_NAME": script_properties.getProperty('author_name'),
    "AUTHOR_GITHUB": script_properties.getProperty('author_github'),
    "PUB_TITLE": script_properties.getProperty('publication_title'),
    "PUB_TYPE": script_properties.getProperty('publication_type'),
    "ARTICLE_URL": script_properties.getProperty('article_url'),
    "REPO_URL": script_properties.getProperty('repo_url'),
    "REPO_OWNER": script_properties.getProperty('repo_owner'),
    "REPO_NAME": script_properties.getProperty('repo_name')
    }

return formValues;
}

// ---------------------------------------------------------------------
// MAIN FUNCTION
// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| START
function runSubmissionWorkflow(formValues){
    var init_response;
    // var status_comment;

    // OPEN issue
    init_response = openIssueForkRepo(formValues);

    // // LOCK issue
    // lockGitHubIssue(init_response.issue_details.number);

    // SEND email on success
    // Fields correspond to (recipient, subject, body, options)
    GmailApp.sendEmail(formValues.AUTHOR_EMAIL,
                       "Your NeuroLibre submission has been received!",
                       "",
                       {htmlBody:getMailBodySuccess(formValues,init_response.issue_details)}
                       );

    if (init_response.fork_status){ // IF FORKED

    var welcomer = init_response.issue_details.assignees[0].login; // This is a welcome team member.

    status_comment = makeComment(init_response.issue_details.number,
                                 "### Your repo has been forked successfully! " +
                                 "\n It is available at "+ "[" + HANDLE + "/" + formValues.REPO_NAME + "]" +
                                 "(https://github.com/" + HANDLE + "/" + formValues.REPO_NAME +").");

    // PUT reponame.yml file
    var yaml = getYAML(formValues,init_response.issue_details.number,welcomer);
    var status_yaml = putFile(HANDLE,formValues.REPO_NAME,yaml,formValues.REPO_NAME + ".yml", false, false);

    // ADD author as collaborator to the forked repo
    var status_collab = addCollaborator(HANDLE,formValues.REPO_NAME,formValues.AUTHOR_GITHUB);

    // SYNC files
    var status_sync = syncFiles(HANDLE,REPO,formValues.REPO_NAME,formValues.PUB_TYPE);

    // READY to go message
    status_comment = makeComment(init_response.issue_details.number,"### We are ready to go!" +
                                // "\n The forked repo has been configured. I am unlocking this conversation." +
                                "\n ***" +
                                "\n @" + welcomer + " please touch base with @" + formValues.AUTHOR_GITHUB +
                                    " to assign a reviewer to [" + HANDLE + "/" + formValues.REPO_NAME + "]" +
                                    "(https://github.com/" + HANDLE + "/" + formValues.REPO_NAME +")." +
                                    "\n I am adding the latest list of NeuroLibre's technical review team below: " +
                                    "\n ***" +
                                    "\n" + getReviewerList());

    // var status_unlock = unlockIssue(init_response.issue_details.number);

    }else{ // IF NOT forked
    status_comment = makeComment(init_response.issue_details.number,
                                 "Hmm...Looks like I cannot fork this repo. "+
                                 "Please confirm that the repository is correctly configured.");
    }
}
// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| END

// ---------------------------------------------------------------------
// OPEN A GITHUB ISSUE AND FORK THE REPOSITORY IF THE CONDITIONS ARE MET
// ===================================================================== START
function openIssueForkRepo(formValues){

  // Title of the GitHub issue
    var title = "🆕✨New submission by " +  formValues.AUTHOR_NAME + " 🎉";
    // Init label for GitHub issue
    var label = [];
    // Source repo URL
    var repo_url = "https://github.com/" + formValues.REPO_OWNER + "/" + formValues.REPO_NAME;
    // Response from getFile
    var response_file ={};

    // Body of the GitHub issue
    var body = "# Submission details"
      + "\n- **Title**: " +  formValues.PUB_TITLE
      + "\n- **Corresponding author**: "
      + "\n     - **Name**: " + formValues.AUTHOR_NAME
      + "\n     - **GitHub handle**: @" + formValues.AUTHOR_GITHUB
      + "\n- **Type**: " + formValues.PUB_TYPE
      + "\n # Source repository"
      + "\n- **Owner**: " + formValues.REPO_OWNER
      + "\n- **Name**: " + formValues.REPO_NAME
      + "\n- **URL**: " + repo_url;

  // NeuroLibre's submission form has logic jumps depending
  // on the type of the submission. Hence, the body of the GitHub
  // issue is populated based on this condition.

  var body_footer;
  if (formValues.PUB_TYPE == "Publication"){
    // Label for the GitHub issue
    label.push("New Publication");
    label.push("pre-review");
    // Add details re article
    body = body + "\n- **Associated journal article** "
         + "\n     - **Citation**: " + formValues.ARTICLE_URL
         + "\n     - **URL**: " + "EDIT";
    body_footer = footerPublication

  } else{
    // Label for GitHub issue
    label.push("New Tutorial");
    label.push("pre-review");
    body_footer = footerTutorial;

   }

   // repoDetails.status flag whether to fork
   // repoDetails.info inspection report
   var inspection_results = inspectGitHubRepo(formValues);

   if(inspection_results.info !== null && inspection_results.info !== '') {
     body = body + "\n ## Source repository details" + inspection_results.info;
    }

    response_file = getFile(HANDLE,REPO,"editorial/neurolibre_roles.json",true,false);

    // THIS MUST BE ARRAY
    // We should decide if this is gonna be one person every time or multi.
    // For now random member selected.
    // We can have a set of rules for this.
    var selected_member = getRandomInt(0, response_file.payload.welcome_team.length);
    var nl_assignee = [selected_member];

    body = body +
    "\n" +
    "\n ***" +
    "\n <img width=\"1233\" src=\"" + body_footer + "\">";

    var response = openIssue(HANDLE,REPO,title,body,label,nl_assignee);

   // Forwards details about the issue opened.
   var issue_details = JSON.parse(response.getContentText());

   var forked = false; // init

   // FORK THE REPOSITORY
   // This should be updated to fork to NeuroLibre once the workflow is finalized
   if (!inspection_results.status){
     forked = forkRepo(formValues.REPO_OWNER,formValues.REPO_NAME,"roboneurotest");
   }

  return {issue_details: issue_details, fork_status: forked};
}
// ===================================================================== END

// ---------------------------------------------------------------------
// LOCK CONVERSATION BY DEFAULT
// ===================================================================== START
// function lockGitHubIssue(issue_number){

//   // Lock issue, to be unlocked on GitHub.
//   // https://developer.github.com/v3/issues/#lock-an-issue

//    var payload = {
//     "locked": true,
//     "active_lock_reason": "resolved"
//    }

//    var options = {
//     "method": "PUT",
//     "contentType": "application/vnd.github.sailor-v-preview+json",
//     "payload": JSON.stringify(payload),
//     "headers" : {
//           Authorization: "token " + TOKEN
//           }
//     };

//   var response = UrlFetchApp.fetch("https://api.github.com/repos/"+HANDLE+"/"+REPO+"/issues/"+String(issue_number)+"/lock", options);
//   //Logger.log(response.getContentText())
// }
// ===================================================================== END

// ---------------------------------------------------------------------
// GET BASIC INFO ABOUT REPO
// ===================================================================== START

function getGitHubInfo(repo_url){
  var answer = {"valid": false, "payload": null};
  var repo;
  var response;

  repo = parseGithubUrl(repo_url);

  response = UrlFetchApp.fetch("https://api.github.com/repos/" + repo.owner + "/" + repo.repo);

  if(response.getResponseCode() == 200) {
      answer.valid = true;
      answer.payload = JSON.parse(response);
    }
return answer;
}
// ===================================================================== END

// ---------------------------------------------------------------------
// CRAWL GITHUB REPO TREE
// ===================================================================== START
function inspectGitHubRepo(formValues){

   var content_info = '';
   var warnings = '';
   // Get file tree on master recursively.
   var response = UrlFetchApp.fetch("https://api.github.com/repos/"+ formValues.REPO_OWNER +"/"+ formValues.REPO_NAME +"/git/trees/master?recursive=true");
   var response_object = JSON.parse(response);

   var blob_url = "https://github.com/"+formValues.REPO_OWNER+"/" +formValues.REPO_NAME+ "/blob/master/";

   var cur_f; // Current file
   var cur_o; // Current object

  var flag = false;
  var response = {};
  response = getFile(HANDLE, REPO, "file-types.json", true, false);

  for (var key in response.payload){
    cur_f = key;
    cur_o = getCollapsibleMD(response_object,cur_f,blob_url);
    content_info += cur_o;
    if (String(key.name) === "Jupyter Notebook" && cur_o == "") flag=true;
  }

  response = UrlFetchApp.fetch("https://api.github.com/repos/"+ formValues.REPO_OWNER +"/"+ formValues.REPO_NAME +"/contributors");
  response_object = JSON.parse(response);

  var contr_list = "";
  for (var i=0; i<response_object.length; i++){
    contr_list += "<li>"+ response_object[i].login + "</li>";
  }

  var contributors =
  "\n ......." +
  "\n <details><summary> <img src=\"" + iconDev +  "\" align=\"left\" height=\"" + 30 + "px\"><b>" + "Contributors" + "</b> </font> </summary>" +
  "<ul>" + "<br>" +
   contr_list +
  "</ul>" +
  "</p>" +
  "</details>" +
  "\n";

  content_info += contributors;

  if (!flag) {
    var verdict =
    "\n" +
    "\n|✅ Provided repository looks good. It will be forked to NeuroLibre!|" +
    "\n|------------------------|" +
    "\n";
  }else{
    var verdict =
    "\n" +
    "\n|❌ Provided repository does not contain a Jupyter Notebook, Actions won't be triggered.|" +
    "\n|------------------------|" +
    "\n";
  }


  return {info: verdict + content_info, status: flag};
}
// ===================================================================== END

function sanityCheck(author_github, author_email, repo_url){
// This function is to check if:
//     i - Author has a valid Github account
//    ii - The URL submitted is a GitHub repository
//   iii - The author_github OR the repo_owner allowed.
// Returns an object with fields:
//    valid: Both (i) and (ii) are met
//    repo_owner: Owner of the passed repo_url
//    repo_name:  Name of the passed repo_url

  var flag = true; // If false, submission won't happen.
  var response_user = {};
  var response_repo;
  var owner="";
  var name="";
  var msg ="";

  // Check if author_github exists as a GitHub user
  response_user = getUserInfo(author_github);

  if (!response_user.valid){
     flag = false;
     msg = "Provided GitHub user (" + author_github + ") does not exist.";
  }

  response_repo = getGitHubInfo(repo_url);

  if (!response_repo.valid){
    flag = false;
    msg = msg + "\n Provided GitHub repository (" + repo_url + ") does not exist.";
 }else{
    owner = response_repo.payload.owner.login;
    name  = response_repo.payload.name;
 }

  // Send user an email about the failed submission
  if (!flag){
    GmailApp.sendEmail(author_email,
                       "Your NeuroLibre submission has failed!",
                       "",
                       {htmlBody:getMailBodyFailure(author_github,msg)}
                       );
  }

  // GET LIST OF ALLOWED USERS
  var response={};
  response = getFile(HANDLE,REPO,"editorial/allowed_list.json",true, false);

  // RAISE THE BYPASS FLAG & SEND EMAIL
  if (!response.payload.allowed.includes(author_github) || !response.payload.allowed.includes(owner)){
    flag = false;
    msg = "\n Corresponding author and/or the repo owner are not included in the allowed list. " +
          "If you think that this is an error, we would very much appreciate to hear from you. " +
          "You can open an issue on <code>neurolibre/submit</code> repository to reach out to us.";
    GmailApp.sendEmail(author_email,
                       "Your NeuroLibre submission has failed!",
                       "",
                       {htmlBody:getMailBodyFailure(author_github,msg)}
                       );
    }else if (response.payload == null){
    //Logger.log("I could not read the json file, you should probably kill the operation.");
    }

return {valid: flag, repo_owner: owner, repo_name: name };
}

function getMailBodySuccess(formValues,response_object)
{
// This functions returns an HTML mail body on a successful submission.
// Mail content is populated by the information fetched from the spreadsheet.
var html_body=
    "<body>" +
     header +
    "<center><h3> Dear " + formValues.AUTHOR_NAME + "</h3><br />"+
    "<p>This mail is to confirm that we have successfully received your NeuroLibre submission.<p>" +
    "<p><i>"+ formValues.PUB_TITLE + "</i></p>" +
    "<h3><b>Your submission ID is #" + String(response_object.number) + ".</b></h3>" +
      "<div style=\"background-color:#f0eded;border-radius:15px;padding:10px\">"+
    "<p><img src=\"https://cdn0.iconfinder.com/data/icons/social-media-9-free/32/social_media_logo_brand_github-512.png\" style=\"height:100px;\"></p>" +
    "<p>We would like to remind you that the reviewing process will happen on <img src=\"https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png\" height=\"12\">.</p>" +
    "<p>To that end, we have automatically created an issue for your submission in the <code>neurolibre/submit</code> repository.</p>" +
    "<a href=\"" + response_object.html_url + "\">" +
    "<button type=\"button\" style=\"background-color:red;color:white;border-radius:6px;box-shadow:5px 5px 5px grey;padding:10px 24px;font-size: 14px;border: 2px solid #FFFFFF;\">Go to my GitHub issue!</button>" +
    "</a>" +
    "</div>" +
    "<p><p><i class=\"fa fa-check fa-4x\" style=\"color:red;\" title=\"Edit\"></i></p><p>"  +
    "<p>Following an automated check, your <b>" + formValues.REPO_OWNER +"/" + formValues.REPO_NAME + "</b> repository will be forked in <b>neurolibre/" + formValues.REPO_NAME + "</b>, if the minimum viable content is available.</p>" +
    "<p> Our system will notify you (@" + formValues.AUTHOR_GITHUB + ") through  <img src=\"https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png\" height=\"12\">.</p>" +
    "<p> For further information, please visit our <a href=\"https://neurolibre.com/submit\">reviewing workflow</a>." +
    "<p>Best regards,</p>" +
    "</center>" +
    "</body>" +
     footer;

return html_body;
}

function getMailBodyFailure(author_name,errMsg){
var html_body =
        "<body>" +
         header  +
        "<center>" +
        "<h3> Dear " + author_name + "</h3><br />"+
        "<p><img src=\"https://cdn2.iconfinder.com/data/icons/freecns-cumulus/32/519791-101_Warning-512.png\" style=\"height:100px;\"></p>" +
        "<h2>" + errMsg + "<h2>" +
        "</center>" +
        "</body>" +
        footer;

return html_body;
}

// Check if provided links are broken
function url_exists(url) {
  var ret_value = false;

  try {
    var safeurl=url.replace(/[{}]/g,"");
    var response = UrlFetchApp.fetch(safeurl);
    if(response.getResponseCode() == 200) {
      ret_value = true;
    }
  } catch (err) {
    ret_value = false;
  }
  return ret_value;
}

function getCollapsibleMD(response_object,obj,blob_url){
  var items = [];

  if (obj.format instanceof Array && obj.format.length >1){

    for (var i =0;i < obj.format.length; i++){
      var tmp = getFileArray(response_object, String(obj.format[i]),obj.abs_match);
      if (tmp && tmp.length){
      items.push(tmp.slice(0));
      }
      }

  }else{
      items = getFileArray(response_object, obj.format,obj.abs_match);
  }

 if (items.length!=0){

    var obj_num = items.length;
    var title = String(obj_num) + " " + obj.name;
    if (items.length > 1) title = title + obj.plural;
    var uList = '';
    for (var i = 0; i < items.length; i++) {
      if (i==0) uList += "<br>";
      uList = uList + "<li><a href=\"" + blob_url + items[i] + "\" target=\"_blank\">" + items[i] + "</a></li>";
    }

    var collapsible = "\n ......." +
    "\n <details><summary> <img src=\"" + obj.icon +  "\" align=\"left\" height=\"" + obj.icon_size + "px\"><b>" + title + "</b> </font> </summary>" +
    "<ul>" +
     uList +
    "</ul>" +
    "</p>" +
    "</details>";

  } else{
   var collapsible = "";
  }

return collapsible;
}

// To find number of occurrences of a specific extension in the file tree.
function getFileArray(obj,extension,abs_match) {
    var curStr = "";
    var file_info = [];
    var count = 0;
    for (var i = 0; i < obj.tree.length; i++) {
        curStr = String(obj.tree[i].path);
      if (!abs_match){
        if (curStr.indexOf(extension)>-1)
        {count++;
         file_info.push(curStr);}
      }else{
        if (curStr === extension)
        {count++;
        file_info.push(curStr);}
      }

    }

return file_info;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getFile(owner,repo,file,isjson,bypass){
// See GitHub API for call details:
// https://docs.github.com/en/rest/reference/repos#get-repository-content

  var answer = {"valid": true, "payload": null};
  var decoded;
  var response = UrlFetchApp.fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + file);

  if (response.getResponseCode() == 200){

    var jsn = JSON.parse(response.getContentText());
    if (!bypass){
      decoded = Utilities.base64Decode(jsn.content);
    }else{
     // In case we need to keep content untouched, don't decode
      decoded = jsn.content;
    }

    if (!bypass){
      if (isjson){
        answer.payload = JSON.parse(Utilities.newBlob(decoded).getDataAsString());
      }else{
        answer.payload = Utilities.newBlob(decoded).getDataAsString();
      }
      }else{ // IF BYPASS
        answer.payload = decoded;
      }
   }else{ // NOT RESPONSE 200
      answer.valid = false;
  }

return answer;
}

function putFile(owner,repo,content,path, isjson, bypass){
// See GitHub API for call details:
// https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents

    if (isjson) content = JSON.stringify(content);

    if(!bypass){
      var encoded = Utilities.base64Encode(content);
    }else{
      // In case need to keep content untouched.
      var encoded = content;
    }

    var msg  = "🤖 Adding file: " + path;

    var payload = {  // TODO: Update this to roboneuro
        "message": msg,
        "committer": {
          "name": "Robo NeuroLibre",
          "email": "roboneurolibre@gmail.com"
        },
        "content": encoded
      };

    var options = {
        "method": "PUT",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "headers" : {
             Authorization: "token " + TOKEN
             }
    };

    var response = UrlFetchApp.fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path, options);
    //Logger.log("PUTFILE" + response.getContentText());
    var status = response.getResponseCode();

return status;
}

function openIssue(owner,repo,title,body,label,assignee){
// See GitHub API documentation for call details:
// https://docs.github.com/en/rest/reference/issues#create-an-issue

   var payload = {
            "title": title,
            "body": body,
            "labels": label,
            "assignees": assignee
     };

    var options = {
        "method": "POST",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "headers" : {
             Authorization: "token " + TOKEN
             }
    };

   // OPEN THE FIRST ISSUE
   var response = UrlFetchApp.fetch("https://api.github.com/repos/"+owner+"/"+repo+"/issues", options);

 return response;
}

function forkRepo(owner,repo,into_orgname){
// See GitHub API documentation for call details:
// https://docs.github.com/en/rest/reference/repos#create-a-fork

  var payload = {
  "organization": into_orgname
  };

  var options = {
  "method": "post",
  "contentType": "application/json",
  "payload": JSON.stringify(payload),
  "headers" : {
   Authorization: "token " + TOKEN
   },
  "muteHttpExceptions": true // Do not break the workflow if cannot fork
  };

  var response = UrlFetchApp.fetch("https://api.github.com/repos/"+owner+"/"+repo+"/forks", options);
  var answer;
  response.getResponseCode()==202 ? answer = true : answer=false;

return answer;
}

function getUserInfo(user_handle){
// See GitHub API documentation for call details:
// https://docs.github.com/en/rest/reference/users#get-a-user

  var response = UrlFetchApp.fetch("https://api.github.com/users/" + user_handle);
  var answer = {"valid":true, "payload": null};
  response.getResponseCode()==200 ? answer.valid = true : answer.valid = false;

  if (answer.valid){
  answer.payload = JSON.parse(response.getContentText());
  }

return answer;
}

function getYAML(formValues, issueNumber, assignee){
  var yaml;
  yaml =
  "title: " + formValues.PUB_TITLE +
  "\nsummary: Please add a brief (50-60 words) summary of your work. This summary will appear at the publication card (https://neurolibre.com)" +
  "\nauthors:" +
  "\n- name: " + formValues.AUTHOR_NAME +
  "\n  website: https://github.com/" + formValues.AUTHOR_GITHUB +
  "\n  affiliation: Please type in your affiliation here. For multiple affiliations, see the next author entry" +
  "\n# Please pay attention to indentations when adding multiple authors." +
  "\n- name: Another Author" +
  "\n  website: If availabe, this entry can point to author's GitHub page or personal website. Please delete this line if not available." +
  "\n  affiliation:" +
  "\n    - Affiliation 1" +
  "\n    - Affiliation 2" +
  "\nkeywords:" +
  "\n  - kw1" +
  "\n  - kw2" +
  "\nsubmission:" +
  "\n  date: " + Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd") +
  "\n  id: " + issueNumber +
  "\n  assignee: " + assignee +
  "\n  category: " + formValues.PUB_TYPE +
  "\n  upstream: https://github.com/" + formValues.REPO_OWNER + "/" + formValues.REPO_NAME;

  if (formValues.PUB_TYPE == "Publication"){
     yaml = yaml +
    "\nassociated_publication:" +
    "\n- citation: " + "EDIT" +
    "\n  url: " + formValues.ARTICLE_URL;
  }

return yaml;
}

function addCollaborator(org,repo,user){
// PUT /repos/:owner/:repo/collaborators/:username

  var payload = {
  "permission": "push"
  };

  var options = {
  "method": "put",
  "contentType": "application/json",
  "payload": JSON.stringify(payload),
  "headers" : {
   Authorization: "token " + TOKEN
   },
  "muteHttpExceptions": true // Do not break the workflow if cannot invite
  };

  var response = UrlFetchApp.fetch("https://api.github.com/repos/"+org+"/"+repo+"/collaborators/" + user, options);
  //Logger.log(response.getContentText());
  var answer;
  response.getResponseCode()==201 ? answer = true : answer=false;

return answer;
}

function syncFiles(org,origin_repo,target_repo,pub_type){
  // Get some files from the template repo for github actions etc.
  var answer = {"valid":true, "payload": null};
  var response;
  var file_list = [
    { from: "actions/publish.yml", to: ".github/workflows/publish.yml" },
    { from: "build-requirements.txt", to: "build-requirements.txt" }
                 ];
  if (pub_type == "Publication"){
      file_list.push({from: "images/publication_template.png", to: target_repo + "_featured.png"});
  }else{
      file_list.push({from: "images/tutorial_template.png", to: target_repo + "_featured.png"});
  }

  for (var i =0; i<file_list.length; i++){

    response = getFile(HANDLE,origin_repo,file_list[i].from,false,true);

    if (response.valid){
    answer.status = putFile(org,target_repo,response.payload,file_list[i].to,false,true);
    }

  }

return answer;
}

function makeComment(issue_number,body){
// POST /repos/:owner/:repo/issues/:issue_number/comments
   var payload = {
  "body": body
  };

  var options = {
  "method": "post",
  "contentType": "application/json",
  "payload": JSON.stringify(payload),
  "headers" : {
   Authorization: "token " + TOKEN
   },
  "muteHttpExceptions": true // Do not break the workflow if cannot invite
  };

  var response = UrlFetchApp.fetch("https://api.github.com/repos/"+HANDLE+"/"+REPO+"/issues/" + String(issue_number) + "/comments", options);
  //Logger.log(response.getContentText());
  var answer;
  response.getResponseCode()==201 ? answer = true : answer=false;

return answer;
}

// function unlockIssue(issue_number){
// // DELETE /repos/:owner/:repo/issues/:issue_number/lock

//    var options = {
//         "method": "delete",
//         "contentType": "application/vnd.github.sailor-v-preview+json",
//         "headers" : {
//              Authorization: "token " + TOKEN
//              }
//     };

//   var response = UrlFetchApp.fetch("https://api.github.com/repos/"+HANDLE+"/"+REPO+"/issues/"+String(issue_number)+"/lock", options);
//   var answer;
//   response.getResponseCode()==204 ? answer = true : answer=false;

// return answer;
// }

function getReviewerList(){

      var response ={};
      var team;

      response = getFile(HANDLE,REPO,"editorial/neurolibre_roles.json",true,false);

      team = response.payload.reviewers;

      var uList = "<details><summary> <img src=\"" + iconReview +  "\" align=\"left\" height=\"" + 30 + "px\"><b>" + "NeuroLibre reviewers" + "</b></summary>";
      var iInfo = {};
      var experience = '';

      for (var i = 0; i < team.length; i++) {

      iInfo = getUserInfo(team[i].handle);

      if (i==0) uList += "<br>";

      uList = uList +
        "<details><summary> <img src=\"" + iInfo.payload.avatar_url +  "\" align=\"left\" height=\"" + 30 + "px\"><b>" + iInfo.payload.name + "</b></summary>" +
        "<br>" +
        "<i>" + team[i].affiliation  + "</i><br>" +
        "Repos: " + iInfo.payload.repos_url + "<br>" +
        "Twitter: " + iInfo.payload.twitter_username +  "<br>"
        "Experience: " ;

        experience = '';
        for (var j=0; j< team[i].expertise.length; j++){
          experience += "<code>" + team[i].expertise[j] + "</code> ";
        }

        uList = uList + experience + "</details>";

      }

      uList = uList + "</details>";

return uList;
}

function parseGithubUrl(url){
// Parse GitHub repo URL into owner and repo
    var matches = url.match(/.*?github.com\/([\w]+)\/([\w-]+)/);
    if(matches && matches.length == 3){
        return {
            owner: matches[1],
            repo: matches[2],
        }
    }
}
