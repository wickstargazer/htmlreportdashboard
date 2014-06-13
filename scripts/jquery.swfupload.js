/*
 * SWFUpload jQuery Plugin v1.0.0
 *
 * Copyright (c) 20013 Wickyorama
 * Licensed under the MIT license.
 *
 */

(function($) {

    var defaultHandlers = [
        'swfupload_preload_handler',
        'swfupload_load_failed_handler',
        'swfupload_loaded_handler',
        'file_dialog_start_handler',
        'file_queued_handler',
        'file_queue_error_handler',
        'file_dialog_complete_handler',
        'upload_resize_start_handler',
        'upload_start_handler',
        'upload_progress_handler',
        'upload_error_handler',
        'upload_success_handler',
        'upload_complete_handler',
        'mouse_click_handler',
        'mouse_out_handler',
        'mouse_over_handler',
        'queue_complete_handler'
    ];
    var additionalHandlers = [];

    $.fn.swfupload = function() {
        var args = $.makeArray(arguments);
        return this.each(function() {
            var swfu;
            if (args.length == 1 && typeof(args[0]) == 'object') {
                swfu = $(this).data('__swfu');
                if (!swfu) {
                    var settings = args[0];
                    var $magicUploadControl = $(this);
                    var handlers = [];
                    $.merge(handlers, defaultHandlers);
                    $.merge(handlers, additionalHandlers);
                    $.each(handlers, function(i, v) {
                        var eventName = v.replace(/_handler$/, '').replace(/_([a-z])/g, function() {
                            return arguments[1].toUpperCase();
                        });
                        settings[v] = function() {
                            var event = $.Event(eventName);
                            $magicUploadControl.trigger(event, $.makeArray(arguments));
                            return !event.isDefaultPrevented();
                        };
                    });
                    $(this).data('__swfu', new SWFUpload(settings));
                }
            } else if (args.length > 0 && typeof(args[0]) == 'string') {
                var methodName = args.shift();
                swfu = $(this).data('__swfu');
                if (swfu && swfu[methodName]) {
                    swfu[methodName].apply(swfu, args);
                }
            }
        });
    };

    $.swfupload = {
        additionalHandlers: function() {
            if (arguments.length === 0) {
                return additionalHandlers.slice();
            } else {
                $(arguments).each(function(i, v) {
                    $.merge(additionalHandlers, $.makeArray(v));
                });
            }
        },
        initStats: function (el, ul) {

            var instance = this.getInstance(el);
            var stats = instance.getStats();
            stats.successful_uploads = $(ul).children().length;
            instance.setStats(stats);
        },
        resetStats: function (el, ul) {
            
            var instance = this.getInstance(el);
            if (instance) {
                var stats = instance.getStats();
                stats.successful_uploads = $(ul).children().length - 1;
                instance.setStats(stats);
            }
        },
        openFileDialog: function (el) {
           
            var instance = this.getInstance(el);
            instance.callFlash("SelectFile");
        },
        defaultHandlers: function() {
            return defaultHandlers.slice();
        },
        getInstance: function(el) {
            return $(el).data('__swfu');
        },
        bindEvents: function (className) {

            $(className).swfupload().bind('swfuploadLoaded', function (event) {
                //$('#log').append('<li>Loaded</li>');
                
                $.swfupload.initStats($(className), $(className).parents('.uploadfilesection').find('ul'));
                
              
            })
                .bind('fileQueued', function (event, file) {
                    //$('#log').append('<li>File queued - '+file.name+'</li>');
                    // start the upload since it's queued
                    $(this).swfupload('startUpload');
                })
                .bind('fileQueueError', function (event, file, errorCode, message) {
                    try {
                        var swfu = $.swfupload.getInstance(className);
                        if (file) {
                            $(this).fileprogress(file, swfu.customSettings.upload_target, swfu.customSettings.upload_bar);
                            $(this).fileprogress('setCancelled');
                        }
                        var imageName = "error.gif";
                        var errorName = "";
                        if (errorCode === SWFUpload.QUEUE_ERROR.QUEUE_LIMIT_EXCEEDED) {
                            if (swfu.customSettings.allow_replace) {
                               
                                bootbox.dialog({
                                    message: "You are about to replace your thumbnail image, Are you sure?",
                                    title: "Image Upload",
                                    buttons: {
                                        danger: {
                                            label: "Yes",
                                            className: "btn-danger",
                                            callback: function () {
                                                $(className).parents(".uploadfilesection").find(".icon-remove").click();
                                                $.swfupload.openFileDialog($(className));
                                                return;
                                            }
                                        },
                                        main: {
                                            label: "Cancel",
                                            className: "btn-secondary",
                                            callback: function () {
                                                //NotifyPanel.show("Primary button");
                                                return;
                                            }
                                        }
                                    }
                                });
                            }
                            else {
                                errorName = "You cannot add another image, please delete existing then add again";
                            }
                        }

                        if (errorName !== "") {
                            alert(errorName);
                            return;
                        }
                        var swfu = $.swfupload.getInstance(className);
                        $(this).fileprogress(file, swfu.customSettings.upload_target, swfu.customSettings.upload_bar);
                        switch (message) {
                            case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
                                imageName = "zerobyte.gif";
                                $(this).fileprogress('addImage', imageName, $('input[name="__RequestVerificationToken"]').val(), 'crap');
                                break;
                            case SWFUpload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
                                imageName = "toobig.gif";
                                $(this).fileprogress('addImage', imageName, $('input[name="__RequestVerificationToken"]').val(), 'crap');
                                break;
                            case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
                            case SWFUpload.QUEUE_ERROR.INVALID_FILETYPE:
                            default:
                                break;
                        }

                        $(this).fileprogress('addImage', imageName, $('input[name="__RequestVerificationToken"]').val(), 'crap');

                    } catch (ex) {
                        $(this).swfupload('debug', ex);
                    }
                })
                .bind('fileDialogStart', function (event) {
                    $('#log').append('<li>File dialog start</li>');
                    //console.log('File dialog start');
                })
                .bind('fileDialogComplete', function (event, numFilesSelected, numFilesQueued) {
                    try {
                        if (numFilesQueued > 0) {
                            $(this).swfupload('startUpload');
                        }
                    } catch (ex) {
                        $(this).swfupload('debug', ex);
                    }
                })
                .bind('uploadStart', function (event, file) {

                    //console.log('Upload start - ' + file.name);
                })
                .bind('uploadProgress', function (event, file, bytesLoaded) {
                    try {
                        var percent = Math.ceil((bytesLoaded / file.size) * 100);
                        //console.log(percent);

                        var swfu = $.swfupload.getInstance(className);
                        $(this).fileprogress(file, swfu.customSettings.upload_target, swfu.customSettings.upload_bar);
                        $(this).fileprogress('setProgress', percent);
                        if (percent === 100) {
                            //$(this).fileprogress('setStatus', "Uploaded...");
                            $(this).fileprogress('toggleCancel', false, this);
                        } else {
                            //$(this).fileprogress('setStatus', "Uploading image...");
                            $(this).fileprogress('toggleCancel', true, this);
                        }
                    } catch (ex) {
                        $(this).swfupload('debug', ex);
                    }
                })
                .bind('uploadSuccess', function (event, file, serverData) {
                    try {
                        //var progress = $(this).fileprogress(file, this.customSettings.upload_target,this.customSettings.upload_bar);


                        try  {
                            var fileObj = JSON.parse(serverData);
                            //console.log(fileObj);
                            var swfu = $.swfupload.getInstance(className);
                            $(this).fileprogress('addImage', className, fileObj[0].ThumbPath, fileObj[0].FileName, fileObj[0].MediaType, fileObj[0].TempFileName, swfu.customSettings.islist);


                            $(this).fileprogress('setStatus', "Thumbnail Created.");
                            $(this).fileprogress('toggleCancel', false);
                        } catch(ex) {
                            $(this).fileprogress('addImage', "/Content/images/none.jpg");
                            $(this).fileprogress('setStatus', "Error.");
                            $(this).fileprogress('toggleCancel', false);
                            bootbox.alert(serverData, function () {
                                Example.show("Please try again or report to admin");
                            });

                        }


                    } catch (ex) {
                        $(this).swfupload('debug', ex);
                    }
                })
                .bind('uploadComplete', function (event, file) {
                    try {
                        /* I want the next upload to continue automatically so I'll call startUpload here */

                        var swfu = $.swfupload.getInstance(className);
                        var stats = swfu.getStats();
                        if (stats.files_queued > 0) {
                            $(this).swfupload('startUpload');
                        } else {
                            //var progress = new FileProgress(file, this.customSettings.upload_target,this.customSettings.upload_bar);
                            $(this).fileprogress('setComplete');
                            $(this).fileprogress('setStatus', "Upload completed");
                            $(this).fileprogress('toggleCancel', false);
                        }
                    } catch (ex) {
                        $(this).swfupload('debug', ex);
                    }
                })
                .bind('uploadError', function (event, file, errorCode, message) {
                    var imageName = "error.gif";
                    var progress;
                    try {
                        switch (message) {
                            case SWFUpload.UPLOAD_ERROR.FILE_CANCELLED:
                                try {
                                    //progress = new FileProgress(file, this.customSettings.upload_target,this.customSettings.upload_bar);
                                    $(this).fileprogress('setCancelled');
                                    $(this).fileprogress('setStatus', "Cancelled");
                                    $(this).fileprogress('toggleCancel', false);
                                }
                                catch (ex1) {
                                    $(this).swfupload('debug', ex);
                                }
                                break;
                            case SWFUpload.UPLOAD_ERROR.UPLOAD_STOPPED:
	                                try {
	                                    //progress = new FileProgress(file, this.customSettings.upload_target,this.customSettings.upload_bar);
	                                    $(this).fileprogress('setCancelled');
	                                    $(this).fileprogress('setStatus', "Stopped");
	                                    $(this).fileprogress('toggleCancel', true);
	                                }
	                                catch (ex2) {
	                                    $(this).swfupload('debug', ex);
	                                }
                            case SWFUpload.UPLOAD_ERROR.UPLOAD_LIMIT_EXCEEDED:
                                imageName = "uploadlimit.gif";
                                break;
                            default:
                                alert(message);
                                break;
                        }

                        $(this).fileprogress('addImage', imageName, $('input[name="__RequestVerificationToken"]').val(), 'crap');

                    } catch (ex3) {
                        $(this).swfupload('debug', ex);
                    }
                });
        }
    };

    $.fn.fileprogress = function(file, targetID, progressID) {

        var args = $.makeArray(arguments);
        return this.each(function() {
            var fileprogress;
            if (args.length == 3) {
                fileprogress = $(this).data('__fileprogress');
                if (!fileprogress) {
                    $(this).data('__fileprogress', new FileProgress(file, targetID, progressID));
                }
            } else if (args.length > 0 && typeof(args[0]) == 'string') {
                var methodName = args.shift();
                fileprogress = $(this).data('__fileprogress');
                if (fileprogress && fileprogress[methodName]) {
                    fileprogress[methodName].apply(fileprogress, args);
                }
            }
        });

    };
    $.fileprogress = {
        getInstance: function(el) {
            return $(el).data('__fileprogress');
        }
    };

})(jQuery);

var FileProgress;
 
if (FileProgress == undefined) {
    FileProgress = function(file, targetID, progressID)
    {
        if (progressID == null)
        {
            throw "No Progress Bar ID";
        }
        else
        {
            this.fileProgressID = '#' + progressID;
        }

        this.fileProgressWrapper = $(this.fileProgressID);

    };
}


FileProgress.prototype.setProgress = function(percentage) {

    $(this.fileProgressID + ' > .progress-bar').css('width', percentage + "%");
    $(this.fileProgressID).css('display', 'block');
};
FileProgress.prototype.setComplete = function() {
    var progressid = this.fileProgressID;
    $(progressid).delay(1500).fadeOut();
};
FileProgress.prototype.setError = function() {

    $(this.fileProgressID + ' > .progress-bar').toggleClass("red");
};
FileProgress.prototype.setCancelled = function() {
  
    $(this.fileProgressID + ' > .progress-bar').toggleClass("red");

};
FileProgress.prototype.setStatus = function (status) {
    $(this.fileProgressID + ' > .progress-bar').html(status);
};

FileProgress.prototype.toggleCancel = function(show, swfuploadInstance) {
   
    var visibility = show ? "visible" : "hidden";
    if (show) {
        var cancelbtn = $("<span class='cancel-uploadbtn glyphicon glyphicon-remove'></span>");
        $(this.fileProgressID).append(cancelbtn);
        if (swfuploadInstance) {
            var fileID = this.fileProgressID;
            $(this.fileProgressID+' > .cancel-uploadbtn').click = function () {
                swfuploadInstance.cancelUpload(fileID);
                return false;
            };
        }
    }
    else {
        $(this.fileProgressID).remove('.cancel-uploadbtn');
    }
};

FileProgress.prototype.addImage = function(containerClass, src, filename,mediaType,tempfilename,islist) {
    var imgid = src.split('=');

    {
   
         var newImg = document.createElement("img");

        newImg.className = 'img-responsive'; 
      
        var elem = null;
        if (islist) {
            elem = $("<li class='img-gallery-item col-xs-6 col-md-3'><a href='javascript:void(0);' class='thumbnail'><i class='glyphicon glyphicon-remove icon-remove' ></i></a></li>");
        }
        else {
            elem = $("<li class='img-gallery-item'><a href='javascript:void(0);' class='thumbnail'><i class='glyphicon glyphicon-remove icon-remove' ></i></a></li>");
        }

        elem.attr({
            'data-filename': filename,
            'data-mediatype': mediaType,
            'data-tempfilename': tempfilename
        });
        
        $(elem).find('a').append(newImg);
        var $newImg = $(elem).find('img'); 
        
        
        $newImg.attr({
            'src': src,
            'data-src': "holder.js/100%x200"
        });
       
        $newImg.load(function(){
            $(this).parent('a').parent('li').fadeIn(500);
        });
        
        $(containerClass).parents('.uploadfilesection').find('.media-items').prepend(elem);
        $(".thumbnail .icon-remove").click(function () {
           
            var btn = $(this).parents('.uploadfilesection').find('.btn');
            var ul = $(this).parents('ul');
            $.swfupload.resetStats(btn,ul);
            $(this).parents("li").remove();
        });
 
    }

    $(newImg).hide();




    newImg.src = src;
    $(newImg).show();
};

