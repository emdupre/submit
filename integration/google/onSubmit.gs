// NeuroLibre submission with GitHub and GMail integration.
// This script is associated with the following:
//      - A Google Form (NeuroLibre submisison)
//      - A Google Spreadheet as the response destination
//      - A GitHub repository (repo scoped access token is required)
//      - A GMail account (ideally belongs to a bot)
// -------------------------------------------------------------------------
// OAuth Scopes required by this script are given in the appscript.json file 
// located at NeuroLibre's submit repo (neurolibre/submit/.google).
//      - This file is not visible by default in the project tab. To
//      make it visible, View --> Show manifest file. 
//      - After you copy the content of NeuroLibre's appscript.json, make sure
//      that the OAuth scopes are listed in (File-->Project Properties-->Scopes).
// -------------------------------------------------------------------------
// This project's triggger (Edit-->Current Project's trigger) must have the
// following configuration: 
//      - Function to run: dispatchToNeuroLibre
//      - Runs at deployment: Head 
//      - Event source: From spreadsheet
//      - Event type: On form submit 
// -------------------------------------------------------------------------
// This script uses GitHub REST API (v3 as of May 2020) to: 
//      - Open an issue on the target repository on form submission (POST)
//      - Fetch issue number and lock the conversation (PUT)
//      - TODO: Update this header.Script got much bigger.
// Please make sure that the API calls are up to date with the resources 
// described by GitHub: https://developer.github.com/. 
// -------------------------------------------------------------------------
// Author: Agah Karakuzu | 2020 
// -------------------------------------------------------------------------

// ---------------------------------------------------------------------
// DEFINE GLOBAL VARIABLES FOR GITHUB & GOOGLE SHEETS
// #####################################################################  START

// GitHub Handle (organization or person)
var HANDLE = "roboneurotest";

// Target GitHub repository (handle/repo)
var REPO = "submit";

// GitHub Token (of a dev who has write access to the repo)
var TOKEN = "REDACTED";

// Note that the variable passed to the scope of this project
// contains form responses in `.values` field with this mapping between
// the column names and the indexes: (A,B,C.. --> 0,1,2...).
 
// The following object literal maps the spreadsheet column indexes to
// the respective fields.

var mapVal = {
  "author_email": 1,
  "author_name": 2, 
  "author_github": 3,
  "publication_title": 4, 
  "publication_type": 5,
  "article_url": 6,
  "article_citation":7, 
  "repo_owner": 8,
  "repo_name": 9
};


// ##################################################################### END

// ---------------------------------------------------------------------
// Global vars for icons and images 
// ##################################################################### START
var icon_binder = "https://avatars3.githubusercontent.com/u/13699731?s=280&v=4";
var icon_jpbook = "https://sphinx-book-theme.readthedocs.io/en/latest/_static/logo.png";
var icon_python = "https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/267_Python_logo-512.png";
var icon_notebook = "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/i/de920fda-40bd-43e8-9ed3-339bb970c3c4/dd8pdzs-cbc64bcd-86d9-4e22-a415-820e63c4e959.png";
var icon_github = "https://cdn2.iconfinder.com/data/icons/black-white-social-media/64/github_social_media_logo-512.png";
var icon_license = "https://cdn0.iconfinder.com/data/icons/customicondesign-office7-shadow-png/256/License-manager.png";
var icon_readme = "https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/273_Readme_logo-512.png";
var icon_twitter = "https://cdn2.iconfinder.com/data/icons/black-white-social-media/32/online_social_media_twitter-512.png";
var icon_dev = "https://cdn1.iconfinder.com/data/icons/badges-achievements-001-solid/68/Artboard_8-512.png";
var icon_website = "https://cdn3.iconfinder.com/data/icons/black-white-social-media/32/www_logo_social_media-512.png";
var logo_neurolibre_outline = "https://github.com/neurolibre/neurolibre.com/blob/master/static/img/favicon.png?raw=true";
var logo_neurolibre = "https://raw.githubusercontent.com/neurolibre/docs.neurolibre.com/master/source/img/logo_neurolibre_old.png";
var icon_docker = "https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png";
var footer_publication = "https://github.com/roboneurotest/submit/blob/master/images/publication_footer.png?raw=true";
var footer_tutorial = "https://github.com/roboneurotest/submit/blob/master/images/tutorial_footer.png?raw=true";
// #####################################################################  END


// Global vars for repo inspection
// ##################################################################### START

// TODO: PUT THIS SECTION AS A JSON TO THE BASE OF THE SUBMIT REPO.

var binderConfig = [
    "environment.yml",
    "Pipfile",
    "Pipfile.lock",
    "setup.py",
    "Project.toml",
    "REQUIRE",
    "install.R",
    "apt.txt",
    "DESCRIPTION",
    "manifest.yml",
    "postBuild",
    "start",
    "runtime.txt",
    "default.nix"
    ];

var inspectObject = {
    "files": [
      { "name":"Jupyter Notebook","format":".ipynb","icon":icon_notebook, "icon_size":30,"plural":"s", abs_match:false},
      { "name":"Dockerfile","format":"Dockerfile","icon":icon_docker, "icon_size":30, "plural":"s", abs_match:false},
      { "name":"JupyterBook config file","format":["_config.yml","toc.yml","_data/toc.yml"],  "icon":icon_jpbook, "icon_size":30, "plural":"s",abs_match:true},
      { "name":"Pip Requirements","format":"requirements.txt", "icon":icon_python, "icon_size":30, "plural":"", abs_match:true},
      { "name":"Other config file","format": binderConfig, "icon":icon_binder, "icon_size":30, "plural":"s", abs_match:true},
      { "name":"Readme","format": "README.md", "icon":icon_readme, "icon_size":30,  "plural":"", abs_match:true},
      { "name":"License","format": "LICENSE", "icon":icon_license, "icon_size":30,  "plural":"", abs_match:true}
     ]

};
// #####################################################################  END


// ---------------------------------------------------------------------
// Global vars for HTML template 
// ##################################################################### START
var header =  "<div style=\"background-color:red;padding:3px;border-radius:15px;\">" +
    "<center><img src=\"" +  logo_neurolibre + "\" height=\"100px\"></img>" +
    "<h2 style=\"margin-top:0! important;color:white;margin-bottom:0! important;font-family: Arial, Helvetica, sans-serif;font-weight:100;\">NeuroLibre</h2></center>" +
    "</div>";

var footer =
    "<div style=\"background-color:#333;height:70px;border-radius:10px;\">" +
    "<p><img src=\"" + logo_neurolibre_outline + "\" height=\"70px\" style=\"float:left;\"></p>" +
    "<p><a href=\"https://twitter.com/neurolibre?lang=en\"><img style=\"height:45px;margin-right:10px;float:right;margin-top:12px;\" src=\"" + icon_twitter + "\"></a></p>" +
    "<a href=\"https://github.com/neurolibre\"><img style=\"height:45px;margin-right:10px;float:right;margin-top:12px;\" src=\"" + icon_github + "\"></a>" + 
    "<a href=\"https://neurolibre.com\"><img style=\"height:45px;margin-right:10px;float:right;margin-top:12px;\" src=\"" + icon_website + "\"></a>" + 
    "</p></div>";
// #####################################################################  END

// ---------------------------------------------------------------------
// MAIN FUNCTION
// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| START
function dispatchToNeuroLibre(nlForm)
{
 
  var initResponse;
  
  if (sanityCheck(nlForm)){
    
    var status_comment;
    initResponse = openIssueForkRepo(nlForm);
    lockGitHubIssue(initResponse.issue_details.number);
    GmailApp.sendEmail(nlForm.values[mapVal.author_email], "Your NeuroLibre submission has been received!","", {htmlBody:getMailBodySuccess(nlForm,initResponse.issue_details)});
    if (initResponse.fork_status){
      
      status_comment = makeComment(initResponse.issue_details.number,"Your repo has been forked successfully!");
      
      var yaml = getYAML(nlForm,initResponse.issue_details.number,initResponse.issue_details.assignees[0].login);
      var status_yaml = putFile("roboneurotest",nlForm.values[mapVal.repo_name],yaml,nlForm.values[mapVal.repo_name] + ".yml", false, false);
      //Logger.log(status_yaml)
      var status_collab = addCollaborator("roboneurotest",nlForm.values[mapVal.repo_name],nlForm.values[mapVal.author_github]);
      //Logger.log(status_collab)
      // SYNCFILES uses agahkarakuzu/submit as origin temporarily
      var status_sync = syncFiles("roboneurotest",REPO,nlForm.values[mapVal.repo_name],nlForm.values[mapVal.publication_type]);
      //Logger.log(status_sync)
      
      status_comment = makeComment(initResponse.issue_details.number,"The forked repo has been configured. We are ready to go! I am unlocking the conversation.");
      var status_unlock = unlockIssue(initResponse.issue_details.number);
      
    }else{
     status_comment = makeComment(initResponse.issue_details.number,"Hmm...Looks like thigs went sideways and I could not fork your repo despite successful submission.");
    }
             
  }else {
  
    Logger.log("The submission did not meet the requirements or blacklisted. An email has been sent to the submitter.");
    
  }


}
// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| END


// ---------------------------------------------------------------------
// OPEN A GITHUB ISSUE AND FORK THE REPOSITORY IF THE CONDITIONS ARE MET
// ===================================================================== START
function openIssueForkRepo(nlForm){

  // Title of the GitHub issue
    var title = "🆕✨New submission by " +  nlForm.values[mapVal.author_name] + " 🎉";
    // Init label for GitHub issue
    var label = [];
    // Source repo URL
    var repo_url = "https://github.com/" + nlForm.values[mapVal.repo_owner] + "/" + nlForm.values[mapVal.repo_name];
 
    // Body of the GitHub issue
    var body = "# Submission details" 
      + "\n- **Title**: " +  nlForm.values[mapVal.publication_title] 
      + "\n- **Corresponding author**: "
      + "\n     - **Name**: " + nlForm.values[mapVal.author_name]
      + "\n     - **GitHub handle**: @" + nlForm.values[mapVal.author_github]
      + "\n- **Type**: " + nlForm.values[mapVal.publication_type]
      + "\n # Source repository"
      + "\n- **Owner**: " + nlForm.values[mapVal.repo_owner]
      + "\n- **Name**: " + nlForm.values[mapVal.repo_name]
      + "\n- **URL**: " + repo_url;

  // NeuroLibre's submission form has logic jumps depending
  // on the type of the submission. Hence, the body of the GitHub
  // issue is populated based on this condition. 
  
  var bodyFooter;
  if (nlForm.values[mapVal.publication_type] == "Publication"){
    // Label for the GitHub issue
    label.push("New Publication");
    // Add details re article 
    body = body + "\n- **Associated journal article** "
         + "\n     - **Citation**: " + nlForm.values[mapVal.article_url]
         + "\n     - **URL**: " + nlForm.values[mapVal.article_citation];
    bodyFooter = footer_publication
    
  } else{
    // Label for GitHub issue
    label.push("New Tutorial");
    bodyFooter = footer_tutorial;
    
   }
   
   // repoDetails.status flag whether to fork
   // repoDetails.info inspection report
   var inspectionResults = inspectGitHubRepo(nlForm);
  
   if(inspectionResults.info !== null && inspectionResults.info !== '') {
     body = body + "\n ## Source repository details" + inspectionResults.info;
    }
    
    var team = getFile(HANDLE,REPO,"editorial/neurolibre_roles.json",true,false);
    
    // THIS MUST BE ARRAY
    // We should decide if this is gonna be one person every time or multi.
    // For now agahkarakuzu only. 
    // We can have a set of rules for this.
    var nlAssignee = [team.welcome_team[1]]; 
    
    body = body +
    "\n" +
    "\n ***" +
    "\n <img width=\"1233\" src=\"" + bodyFooter + "\">";
  
    var response = openIssue(HANDLE,REPO,title,body,label,nlAssignee);
   
   // Forwards details about the issue opened. 
   var issueDetails = JSON.parse(response.getContentText());
   
   var forked = false; // init
  
   // FORK THE REPOSITORY
   if (!inspectionResults.status){
     forked = forkRepo(nlForm.values[mapVal.repo_owner],nlForm.values[mapVal.repo_name],"roboneurotest");
  
   }
  
  
  return {issue_details: issueDetails, fork_status: forked};
}
// ===================================================================== END 


// ---------------------------------------------------------------------
// LOCK CONVERSATION BY DEFAULT
// ===================================================================== START
function lockGitHubIssue(issue_number){
  
  // Lock issue, to be unlocked on GitHub.
  // https://developer.github.com/v3/issues/#lock-an-issue
  
   var payload = {
  "locked": true,
  "active_lock_reason": "resolved"
   }
  
   var options = {
        "method": "PUT",
        "contentType": "application/vnd.github.sailor-v-preview+json",
        "payload": JSON.stringify(payload),
        "headers" : {
             Authorization: "token " + TOKEN
             }
    };
  
  var response = UrlFetchApp.fetch("https://api.github.com/repos/"+HANDLE+"/"+REPO+"/issues/"+String(issue_number)+"/lock", options);  
  //Logger.log(response.getContentText())

}
// ===================================================================== END

// ---------------------------------------------------------------------
// CRAWL GITHUB REPO TREE
// ===================================================================== START
function inspectGitHubRepo(nlForm){
   
   var contentInfo = '';
   var warnings = '';
   // Get file tree on master recursively.
   var response = UrlFetchApp.fetch("https://api.github.com/repos/"+ nlForm.values[mapVal.repo_owner] +"/"+ nlForm.values[mapVal.repo_name] +"/git/trees/master?recursive=true");
   var responseObject = JSON.parse(response);
      
   var blob_url = "https://github.com/"+nlForm.values[mapVal.repo_owner]+"/" +nlForm.values[mapVal.repo_name]+ "/blob/master/";
  
   var curF; // Current file
   var curO; // Current object
  
  var flag = false;
  for (var i =0; i < inspectObject.files.length;i++){
    curF = inspectObject.files[i];
    curO = getCollapsibleMD(responseObject,curF,blob_url);
    contentInfo += curO;
    if (String(inspectObject.files[i].name) === "Jupyter Notebook" && curO == "") flag=true;
  }
  
  response = UrlFetchApp.fetch("https://api.github.com/repos/"+ nlForm.values[mapVal.repo_owner] +"/"+ nlForm.values[mapVal.repo_name] +"/contributors");
  responseObject = JSON.parse(response);
  
  var contrList = "";
  for (var i=0; i<responseObject.length; i++){       
    contrList += "<li>"+ responseObject[i].login + "</li>";      
  }
  
  var contributors = 
  "\n ......." +
  "\n <details><summary> <img src=\"" + icon_dev +  "\" align=\"left\" height=\"" + 30 + "px\"><b>" + "Contributors" + "</b> </font> </summary>" + 
  "<ul>" + "<br>" +
   contrList + 
  "</ul>" +
  "</p>" + 
  "</details>" +
  "\n";
  
  contentInfo += contributors;
  
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


  return {info: verdict + contentInfo, status: flag}; 
}
// ===================================================================== END


function sanityCheck(nlForm){
  
  var flag = true; // If false, submission won't happen.
  var msg = '';
  
  // Check if GitHub user exists 
  if (!url_exists("https://github.com/" + nlForm.values[mapVal.author_github])){
     flag = false;
     msg = "Provided GitHub user (" + nlForm.values[mapVal.author_github] + ") does not exist.";
  }
  
  // Check if GitHub repository exists 
  if (!url_exists("https://github.com/" + nlForm.values[mapVal.repo_owner] + "/" + nlForm.values[mapVal.repo_name])){
     flag = false;
     msg = msg + "\n Provided GitHub repository (" + nlForm.values[mapVal.repo_owner] + "/" + nlForm.values[mapVal.repo_name] + ") does not exist.";
  }
  
  // Send user an email about the failed submission
  if (!flag){
      
    GmailApp.sendEmail(nlForm.values[mapVal.author_email], "Your NeuroLibre submission has failed!","", {htmlBody:getMailBodyFailure(nlForm,msg)});

  }
  
  // GET LIST OF BLOCKED USERS
  var blacklist;
  blacklist = getFile(HANDLE,REPO,"editorial/blacklist.json",true, false);

  // RAISE THE BYPASS FLAG & SEND EMAIL
  if (blacklist.blocked.includes(nlForm.values[mapVal.author_github]) || blacklist.blocked.includes(nlForm.values[mapVal.repo_owner])){
    flag = false; 
    msg = "\n Corresponding author and/or the repo owner are listed in our blacklist. If you think that this is an error, we would very much appreciate to hear from you." + 
          "You can open an issue on <code>neurolibre/submit</code> repository to reach out to us.";  
    GmailApp.sendEmail(nlForm.values[mapVal.author_email], "Your NeuroLibre submission has failed!","", {htmlBody:getMailBodyFailure(nlForm,msg)});
    }else if (blacklist == null){
    //Logger.log("I could not read the json file, you should probably kill the operation.");
    }

return flag;  
}

function getMailBodySuccess(nlForm,responseObject)
{

// This functions returns an HTML mail body on a successful submission.
// Mail content is populated by the information fetched from the spreadsheet.  
  
var htmlBody=
    "<body>" +
     header + 
    "<center><h3> Dear " + nlForm.values[mapVal.author_name] + "</h3><br />"+
    "<p>This mail is to confirm that we have successfully received your NeuroLibre submission.<p>" +
    "<p><i>"+ nlForm.values[mapVal.publication_title] + "</i></p>" +
    "<h3><b>Your submission ID is #" + String(responseObject.number) + ".</b></h3>" +
      "<div style=\"background-color:#f0eded;border-radius:15px;padding:10px\">"+
    "<p><img src=\"https://cdn0.iconfinder.com/data/icons/social-media-9-free/32/social_media_logo_brand_github-512.png\" style=\"height:100px;\"></p>" +     
    "<p>We would like to remind you that the reviewing process will happen on <img src=\"https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png\" height=\"12\">.</p>" + 
    "<p>To that end, we have automatically created an issue for your submission in the <code>neurolibre/submit</code> repository.</p>" +
    "<a href=\"" + responseObject.html_url + "\">" +
    "<button type=\"button\" style=\"background-color:red;color:white;border-radius:6px;box-shadow:5px 5px 5px grey;padding:10px 24px;font-size: 14px;border: 2px solid #FFFFFF;\">Go to my GitHub issue!</button>" +
    "</a>" +
    "</div>" +
    "<p><p><i class=\"fa fa-check fa-4x\" style=\"color:red;\" title=\"Edit\"></i></p><p>"  +
    "<p>Following an automated check, your <b>" + nlForm.values[mapVal.repo_owner] +"/" + nlForm.values[mapVal.repo_name] + "</b> repository will be forked in <b>neurolibre/" + nlForm.values[mapVal.repo_name] + "</b>, if the minimum viable content is available.</p>" +
    "<p> Our system will notify you (@" + nlForm.values[mapVal.author_github] + ") through  <img src=\"https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png\" height=\"12\">.</p>" +
    "<p> For further information, please visit our <a href=\"https://neurolibre.com/submit\">reviewing workflow</a>." + 
    "<p>Best regards,</p>" + 
    "</center>" +
    "</body>" +
     footer;

return htmlBody;
}

function getMailBodyFailure(nlForm,errMsg){
var htmlBody = 
        "<body>" +
         header  + 
        "<center>" +
        "<h3> Dear " + nlForm.values[mapVal.author_name] + "</h3><br />"+  
        "<p><img src=\"https://cdn2.iconfinder.com/data/icons/freecns-cumulus/32/519791-101_Warning-512.png\" style=\"height:100px;\"></p>" +     
        "<h2>" + errMsg + "<h2>" + 
        "</center>" +
        "</body>" + 
        footer; 
  
return htmlBody;
}

// Check if provided links are broken
function url_exists(url) {
  var retValue = false;

  try {
    var safeurl=url.replace(/[{}]/g,"");
    var response = UrlFetchApp.fetch(safeurl);
    if(response.getResponseCode() == 200) {  
      retValue = true;
    }
  } catch (err) {
    retValue = false;
  }
  return retValue;
}

function getCollapsibleMD(responseObject,obj,blob_url){

  var items = [];
  
  if (obj.format instanceof Array && obj.format.length >1){
    
    for (var i =0;i < obj.format.length; i++){
      var tmp = getFileArray(responseObject, String(obj.format[i]),obj.abs_match);
      if (tmp && tmp.length){
      items.push(tmp.slice(0));
      }
      } 
  
  }else{
      items = getFileArray(responseObject, obj.format,obj.abs_match);

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
    var fileInfo = [];
    var count = 0;
    for (var i = 0; i < obj.tree.length; i++) {
        curStr = String(obj.tree[i].path);
      if (!abs_match){ 
        if (curStr.indexOf(extension)>-1) 
        {count++; 
         fileInfo.push(curStr);}
      }else{
        if (curStr === extension)
        {count++; 
        fileInfo.push(curStr);}  
      }
    
    }

return fileInfo;
}

function getFile(owner,repo,file,isjson,bypass){
// Add GITHUB API documentation link
// TODO: FIX VARIABLE NAMING HERE
  
  var answer;
  var decoded;
  var response = UrlFetchApp.fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + file);
  //Logger.log("GETFILE" + response.getContentText());
  
  if (response.getResponseCode() == 200){
  
    var jsn = JSON.parse(response.getContentText());
    if (!bypass){
      decoded = Utilities.base64Decode(jsn.content);
    }else{
     // In case need to keep content untouched.  
      decoded = jsn.content;
    }
    
    if (!bypass){
    if (isjson){
      answer = JSON.parse(Utilities.newBlob(decoded).getDataAsString());
    }else{
      answer = Utilities.newBlob(decoded).getDataAsString();
    }
    }else{ // IF BYPASS
      answer = decoded;
    }
    
   }else{ // NOT RESPONSE 200
   var answer = null;
  }

return answer;
}

function putFile(owner,repo,content,path, isjson, bypass){
// Add GITHUB API documentation link
  
    if (isjson) content = JSON.stringify(content);
  
    if(!bypass){
      var encoded = Utilities.base64Encode(content);
    }else{
      // In case need to keep content untouched.
      var encoded = content;
    }
  
    var msg  = "🤖 Adding file: " + path;
  
    var payload = {
        "message": msg,
        "committer": {
          "name": "Agah Karakuzu",
          "email": "agahkarakuzu@gmail.com"
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
  
    var response = UrlFetchApp.fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path,options);
    //Logger.log("PUTFILE" + response.getContentText());
    var status = response.getResponseCode();

return status;
}

function openIssue(owner,repo,title,body,label,assignee){
// Add GITHUB API documentation link
  
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
// Add GITHUB API documentation link
  
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

function getYAML(nlForm, issueNumber, assignee){
  var yaml;
  yaml = 
  "title: " + nlForm.values[mapVal.publication_title] +
  "\nsummary: Please add a brief (50-60 words) summary of your work. This summary will appear at the publication card (https://neurolibre.com)" + 
  "\nauthors:" +
  "\n- name: " + nlForm.values[mapVal.author_name] +
  "\n  website: https://github.com/" + nlForm.values[mapVal.author_github] +
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
  "\n  category: " + nlForm.values[mapVal.publication_type] + 
  "\n  upstream: https://github.com/" + nlForm.values[mapVal.repo_owner] + "/" + nlForm.values[mapVal.repo_name];
 
  if (nlForm.values[mapVal.publication_type] == "Publication"){
     yaml = yaml + 
    "\nassociated_publication:" + 
    "\n- citation: " + nlForm.values[mapVal.article_citation] + 
    "\n  url: " + nlForm.values[mapVal.article_url]; 
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
  var answer; 
  
  var fileList = [{from: "actions/publish.yml", to: ".github/workflows/publish.yml"}
                 ];
  if (pub_type == "Publication"){
      fileList.push({from: "images/publication_template.png", to: target_repo + "_featured.png"});
  }else{
      fileList.push({from: "images/tutorial_template.png", to: target_repo + "_featured.png"});
  }
   
  var status;
  var content; 
  
  for (var i =0; i<fileList.length; i++){
   
    content = getFile(HANDLE,origin_repo,fileList[i].from,false,true);
    status = putFile(org,target_repo,content,fileList[i].to,false,true);

  }
  
return status;  
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

function unlockIssue(issue_number){
// DELETE /repos/:owner/:repo/issues/:issue_number/lock
  
   var options = {
        "method": "delete",
        "contentType": "application/vnd.github.sailor-v-preview+json",
        "headers" : {
             Authorization: "token " + TOKEN
             }
    };
  
  var response = UrlFetchApp.fetch("https://api.github.com/repos/"+HANDLE+"/"+REPO+"/issues/"+String(issue_number)+"/lock", options);  
  var answer;
  response.getResponseCode()==204 ? answer = true : answer=false;

return answer;  
}
