/*
 * Multiple File Upload - jQuery Plugin 1.0
 * Requires: jQuery v1.3+
 * https://github.com/foxinmy
 *
 * Copyright 2012.12 jy.hu Shenzhen
 * 
 */
;(function($){
    
	String.prototype.sub = function(len){
		var _len = 0;
		var _str = "";
		for(var i=0;i<this.length;i++){
			if(this.charCodeAt(i) > 255)
				_len += 2;
			else
				_len +=1;
			if(_len>len)
				return _str + "...";
			_str += this.charAt(i);
		}
		return this;
	};
	// the predefine variables
	var iframe,title,form,table,bottom,mask,wrap,ahref,addButton,submitButton,cancelButton,deleteButton,previewDiv,loading,text='共${0}个文件,合计大小：${1}',imgArrays={},
	
		xhrs=[],imgLoader=new Image(),imgRegExp = /\.(jpg|gif|png|bmp|jpeg)(.*)?$/i,busy=false,isIE=false,total=0,filesStore=[],loadingTimer, loadingFrame = 1,
		
		ulliTmplate = "<ul><li style='width:30%'><span class='image-preview' title='${0}'>${1}</span></li><li  style='width:13%;text-align:right'>${2}</li><li class='process'></li><li style='width:10%;text-align:center'><a href='javascript:void(0);' title='上传' name='aupload' class='aupload'></a><a href='javascript:void(0);' title='取消' name='acancel' class='acancel'></a></li></ul>",
		
		randomPool = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"],
		
		supportXHRFileUpload = (window.File && window.FileList) || false,
		
		supportXHRFormDataFileUpload = (window.FormData) || false,
	// the default configuration
	_config = {
		fmName : "_form-upload",
		feName : "files",
		fmType : "post",
		width:640,
		height:150,
		fmDatas : null,
		url : "fileUpload" ,
		maxUploadSize : 1024*1024*10,
		maxPreviewSize : 1024*1024*5,
		previewFileType :  /^image\/(jpg|gif|png|bmp|jpeg)$/,
		previewWidth : 120,
		previewHeight :80,
		allowedTypes : "*" ,
		onStart : function(data){return true;},
		onComplete : function(text){},
		onError : function(text){},
		onAlways : function(data){return true;}
	},
	// initialize html block
	_initUI = function(){

		if($('#dialog_wrap_div').length){
			return;
		}
			
		iframe = $("<iframe height='0' width='0' frameborder='0' scrolling='no' name='_iframe-upload' src='javascript:false;' style='display:none'></iframe>");
		title = $("<div id='dialog_wrap_title'></div>");
		table = $("<div class='table'><div class='drag'>drag the file from your desktop</div></div>");
		bottom = $("<div id='dialog_wrap_bottom'><table><tbody><tr><td style='width:80%'><span></span></td><td style='width:10%'><div id='loading' class='loading'></div></td><td class='submit'></td></tr></tbody></table></div>");
		form = $("<form target='_iframe-upload' enctype='multipart/form-data'></form>");
		mask = $("<div style='position:fixed; opacity: 0.25; z-index: 999; top: 0px; left: 0px; background-color: rgb(0, 0, 0); display: none;'></div>")
						.css("height","100%").css("width","100%");
		wrap = $("<div id='dialog_wrap_div'></div>").css({"min-height":_config.height+"px","width":_config.width+"px"});
		ahref = $("<a class='closebtn'></a>").appendTo(form);
		addButton = $("<span class='btn addbtn'><span>添加文件..</span><input type='file' name='files[]' multiple='multiple'></span>").appendTo(title);
		submitButton = $("<input type='button' value='开始上传' class='btn submitbtn'>").appendTo(bottom.find('table').find('td[class="submit"]'));
		cancelButton = $("<input type='button' value='取消上传' class='btn cancelbtn'>").appendTo(title);
		deleteButton = $("<input type='button' value='全部删除' class='btn deletebtn'>").appendTo(title);
		previewDiv = $("<div id='dialog_preview_div'><img/></div>");
		loading = $('#loading');
		
		title.appendTo(form);
		table.appendTo(form);
		bottom.appendTo(form);
		form.append(iframe).appendTo(wrap);
		isIE = (document.all) ? true : false;//navigator.userAgent.toLowerCase().search(/msie/g)>-1;
		if(isIE){
			var _height = Math.max(document.documentElement.scrollHeight, document.documentElement.clientHeight);
			var _width = Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth);
			//(/[msie](\s*)?(\d)\.0/ig.exec(navigator.userAgent.toLowerCase())[2] == 6)
			mask.css({"filter":"alpha(opacity=25)","position":"absolute",
				"height" :  _height,
				"width" : _width});
			table.find('ul').live('mouseover',function(e){
				$(this).css({"background-color":"#f6fafd"});
			}).live('mouseout',function(e){
				$(this).css({"background-color":"#eeeeee"});
			});
			table.find('div[class="drag"]').html('please select a file.');
			$("<iframe style='position:absolute;top:0;left:0;z-index:998;filter:alpha(opacity=0);display:none;' id='_iframe-fix-ie6-select' src='javascript:false;'></iframe>")
				.css({"height":_height,"width":_width}).appendTo(document.body);
				
			cancelButton.css('width',110);
			deleteButton.css('width',110);
		}
		form.attr({'method':_config.fmType,'action':_config.url,'id':_config.fmName});
		addButton.find(":file").attr({'accept':_config.allowedTypes,'name':_config.feName});
		
		wrap.appendTo(document.body);
		mask.appendTo(document.body);
		previewDiv.appendTo(document.body);
	},
	// drag the title div and drag file from desktop (nonsupport ie browser)
	_dragUI = function(){
		//--------------drag title begin
		title.bind('mousedown',function(e){
			 $(this).data('pre_offset',wrap.offset())
				  .data('pre_postion',{X:e.clientX,Y:e.clientY})
				  .data('is_move',true);
		}).bind('mouseup mouseout',function(e){
			$(this).data('is_move',false);
			if(isIE) this.releaseCapture();
		}).bind('mousemove',function(e){
			var $this = $(this);
			if((e.srcElement || e.target).tagName != 'DIV') {$this.data('is_move',false);return;};
			var offset = $this.data('pre_offset');
			var pos = $this.data('pre_postion');
			if(!$this.data('is_move')) return;
			wrap.css({
				left: (offset.left+e.clientX-pos.X),
				top: (offset.top+e.clientY-pos.Y)
			});
			if(isIE){
				this.setCapture();
			}else{
				e.preventDefault();
				e.stopPropagation();
			}
		});
		//-----------------drag title end
		//-----------------drag file begin
		if(supportXHRFileUpload){
			table.bind('dragenter',function(e){
				if(!$(this).hasClass('tbhover'))
					$(this).addClass('tbhover');
				_bubble(e);
			}).bind('dragover',function(e){
				if(!$(this).hasClass('tbhover'))
					$(this).addClass('tbhover');
				_bubble(e);
			}).bind('dragleave',function(e){
				_bubble(e);
				if($(this).hasClass('tbhover'))
					$(this).removeClass('tbhover');
			});
			_bind(table,'drop',function(e){
				$(this).find('div[class="drag"]').hide();
				$(this).removeClass('tbhover');
				var fs = e.target.files || e.dataTransfer.files;
				_append(fs);
				_bubble(e);
			});
		}
		//-----------------drag file end
	},
	// bind events for 
	_bindEvent = function(){
		ahref.bind('click',_close);
		deleteButton.bind('click',function(e){
			if(!table.find('div').is(":hidden")) return;
			busy=true;
			$.each(table.find('ul'),function(index,ul){
				$(ul).fadeOut(300,function(e){
					$(this).remove();
				});
			});
			busy=false;
			_reset();
		});
		addButton.find(":file").bind('change',function(e){
			var $this = $(this);
			if($this.val().length == 0)return;
			var $files = $this.attr('files');
			if(table.is(":hidden")) table.fadeIn(300);
			table.find('div[class="drag"]').hide();
			// html5 multiple 
			if($files){
				_append($files);
			}else{
				imgLoader = new Image();
				var _path = $this.val();
				var _size  = 0;
				var _type = "image/"+_path.substr(_path.lastIndexOf("\.") + 1);
				var _doAppend = function(){
					_append([{
						path:_path,
						name:_path.substr(_path.lastIndexOf("\\") + 1),
						size:_size,
						type:_type
					}]);
				}
				try{
					imgLoader.dynsrc = _path;
					_size = imgLoader.fileSize;
					_doAppend();
				}catch(e){
					if(_config.previewFileType.test(_type)){
						this.select();
						_path = document.selection.createRange().text;
						imgLoader.src = _path;
						if(!imgLoader.complete){
							imgLoader.onload = function(){
								_size = this.fileSize;
							_doAppend();
							}
						}else{
							_size = imgLoader.fileSize;
							_doAppend();
						}
					}else{
						_size = -1;
						_doAppend();
					}
				}
			}
		});
		submitButton.bind('click',function(e){
			if(busy)return;
			if(filesStore && filesStore.length > 0){
				//form.get(0).submit();
				busy = true;
				loading.show();
				$.each(filesStore,function(index,file){
					if(!file.error)
						_aupload(file.uniqueId,$(table.find("ul")[index]));
				});
				_onCallback.call(this);
			}
		});
		_dragUI();
	},
	// show shade and wrap div
	_showUI = function(){
		// ie browser fix
		if(isIE)
			$('#_iframe-fix-ie6-select').show();
		mask.fadeIn(300);
		wrap.fadeIn(300,function(){
			busy = false;
		});
	},
	_setid = function(){
		var _unique_ID,_cache_ID = "";
		_unique_ID = _cache_ID = this.size;
		if(this.lastModifiedDate){
				_cache_ID += "-" + this.lastModifiedDate.getTime();
		}
		_unique_ID += "-" + new Date().getTime() + "-" + randomPool[Math.floor(Math.random()*26)] + randomPool[Math.floor(Math.random()*26)] 
							+ randomPool[Math.floor(Math.random()*26)];
		this.cacheId = _cache_ID;
		this.uniqueId = _unique_ID;
	},
	// append file information to table ui
	_append = function(fs){
		var _temp = '';
		var _pre = '';
		var _up = undefined,_pro = undefined;
		$.each(fs,function(index,file){
			_temp = $(ulliTmplate.replace(/\$\{0\}/ig,file.name).replace(/\$\{1\}/ig,file.name.sub(28)).replace(/\$\{2\}/,_size(file.size)));
			_pre = _temp.find('span[class="image-preview"]');
			_up = _temp.find('a[name="aupload"]');
			_pro = _temp.find("li[class='process']");
			_setid.call(file,null);
			file.error = _hasError(file);
			_temp.find('a[name="acancel"]').bind('click',{id:file.uniqueId,ul:_temp},function(e){_acancel(e.data.id,e.data.ul)});
			if(file.error){
				_pro.append("<span>Error</span>&nbsp;").append(file.error);
				_up.remove();
			}else{
				_up.bind('click',{ul:_temp,id:file.uniqueId},function(e){_aupload(e.data.id,e.data.ul,$(this))});
				_pro.append("<div aria-valuemin='0' aria-valuemax='100' aria-valuenow='0'><div class='bar' style='width:0%;'></div></div>");
			}
			if(_config.previewFileType.test(file.type) && file.size < _config.maxPreviewSize){
				_pre.unbind('mouseover mouseout').bind('mouseover',function(e){
					_preview({file:file,pos:_point(e)});
				}).bind('mouseout',function(e){
					previewDiv.hide();
				});
			};
			_temp.appendTo(table).fadeIn('slow');
			filesStore[file.uniqueId] = file;
		});
		$.merge(filesStore,fs);
		_span();
	},
	// remove an item from files
	_remove = function(index){
		if(typeof index === 'number'){
			if(index > filesStore.length || -index > filesStore.length) return;
			if(index < 0) index = filesStore.length + index;
			filesStore.splice(index,1);
		}else{
			$.each(filesStore,function(i,item){
				if(index == item){
					filesStore.splice(item.index,1);
					return false;
				}
			});
		}
	},
	// update file information
	_span = function(){
		total = _total();
		var span = bottom.find('span');
		span.empty();
		span.append(text.replace(/\$\{0\}/ig,filesStore.length).replace(/\$\{1\}/,total > 0 ? _size(total) : "unkonw"));
		if(span.is(':hidden')) span.show();
	},
	// image preview handler when mouse over the span
	_preview = function(data){
		var _doLoad = function(img,id){
			if(img.width ==0 || img.height ==0 || img.src.length == 0)
				_error();
			else
				_load({bg:'#C0C0C0',img:img},id);
			img.onerror = img.onload = null;
		};
		var _doComplete = function(img,id){
			if(img.complete){
				_doLoad(img,id);
			}else{
				img.onload = function(){
					_doLoad(img,id);
				}
			}
		};
		busy = true;
		if(imgArrays[data.file.cacheId]){
			_load({x:data.pos.x,y:data.pos.y,bg:'#C0C0C0',img:imgArrays[data.file.cacheId]});
			busy = false;
			return;
		}
		_load({x:data.pos.x,y:data.pos.y,bg:'white',isBG:true,bgName:"imgloading",img:{width:16,height:16}});
		imgLoader = new Image();
		imgLoader.onerror = function() {
			_error();
		};
		if(supportXHRFileUpload && window.FileReader){
			var fileReader = new FileReader();
			fileReader.readAsDataURL(data.file);
			fileReader.onerror = function(e){
				
			};
			fileReader.onload = function(e){
				imgLoader.src = e.target.result;
				_doComplete(imgLoader,data.file.cacheId);
			};
		}else{
			imgLoader.src = data.file.path;
			_doComplete(imgLoader,data.file.cacheId);
		}
		busy = false;
	},
	// 鼠标悬浮显示图片
	_load = function(data,cacheId){
		if(data.x){
			previewDiv.css({
				top:data.y,
				left:data.x
			});
		};
		previewDiv.removeClass();
		previewDiv.css({
			backgroundColor:data.bg,
			width:data.img.width>_config.previewWidth ? _config.previewWidth  : data.img.width,
			height:data.img.height>_config.previewHeight ? _config.previewHeight : data.img.height
		});
		var _img = previewDiv.find('img');
		if(data.isBG){
			_img.hide();
			previewDiv.addClass(data.bgName);
		}else{
			_img.attr({
				src:data.img.src,
				width:data.img.width,
				height:data.img.height
			}).show();
		}
		if(!imgArrays[cacheId]){
			imgArrays[cacheId] = data.img;
		}
		previewDiv.show();
	},
	_acancel = function(id,ul){
		if(busy && xhrs[id]){
			xhrs[id].abort();
			xhrs[id] = null;
			return;
		};
		var uls = table.find('ul');
		ul.fadeOut(300,function(e){
			if(uls.length ==1){
				_reset();
			}else{
				_remove(uls.index(ul)*1);
				_span();
			}
			busy = false;
			ul.remove();
		});
	},
	_aupload = function(id,ul,that){
		var uls = table.find('ul');
		if(!that){
			that = ul.find("a[name='aupload']");
		}
		if(supportXHRFormDataFileUpload){
			var _formData = new FormData();
			_formData.append(_config.feName,filesStore[id]);
			$.each(_datas(),function(index,field){
				_formData.append(field.name,field.value);
			});
			_process.call(that,id,_formData,ul.find("li[class='process']"));
		}else{
			
		}
	},
	_bindForm = function(){
		$.each(_datas(),function(index,field){
			$("<input type='hidden'>").attr('name',field.name).val(field.value).appendTo(form);
		});
	},
	_onComplete = function(){
		busy = false;
	},
	_onCallback = function(){
		if(!loading.is(":hidden"))
			loading.hide();
		busy = false;
	},
	_process = function(id,data,li){
		if(_config.onStart.call(this,data)){
			busy = true;
			var xhr = xhrs[id] ? xhrs[id] : _xhr(id);
			$(xhr.upload).bind("progress",{me:this},function(e){
				var _oe= e.originalEvent;
				if(_oe.lengthComputable){
					$(li).find("div[class='bar']").css("width",(_oe.loaded/_oe.total)*100+'%');
					if(_oe.loaded==_oe.total){
						e.data.me.remove();
					}
				}
			});
			xhr.open("post",_config.url,true);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			//xhr.setRequestHeader("X-File-Name", encodeURIComponent(name));
			xhr.setRequestHeader("Cache-Control", "no-cache");
			xhr.onreadystatechange = function(a){
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						_config.onComplete.call(xhr,xhr.responseText);
						_onComplete.call(xhr,null);
					}else if(xhr.status == 404){
						_config.onError.call(this,"Not Found!");
					}else if(xhr.status.toString().charAt(0) == 5){
						_config.onError.call(this,"Server Error!");
					}else{
						_config.onError.call(this,"Others!");
					}
				}
			};
			try{
				xhr.send(data);
			}catch(e){
				switch(e.code){
					case 101:
						_config.onError.call(xhr,"Failed to send request!");
					break;
				}
			}
		}
	},
	_hasError = function(file){
		if(file.error){
			return file.error;
		}
		if(_config.allowedTypes!='*'){
			if(!new RegExp(_config.allowedTypes).test(file.type)){
				return "filetype not allowed";
			}
		}
		if(file.size > _config.maxUploadSize){
				return "file is too big";
		}
		return null;
	},
	// bind the event to element 
	_bind = function(target,type,fn){
		target = target.get(0);
		if(!(target || type || fn)) return;
		if(isIE){
			target.setCapture();
			target.attachEvent('on'+type,fn);
		}else{
			target.addEventListener(type,fn,false);
		}
		return target;
	},
	// cleanup data or content
	_abort = function(){
		form.find(":file").empty();
		imgLoader.onerror = imgLoader.onload = null;
		table.find('ul').remove();
		bottom.find('span').empty().hide();
		table.find('div[class="drag"]').show();
		if(isIE)$('#_iframe-fix-ie6-select').hide();
		imgArrays = {};
		busy = false;
	},
	// reset file information
	_reset = function(){
		total = 0;
		filesStore.length = 0;
		table.find('div[class="drag"]').slideDown('slow');
		bottom.find('span').empty().hide();
	},
	// exception handler
	_error = function(){
		_load({bg:'#C0C0C0',isBG:true,bgName:"loadingerror",img:{width:120,height:80}});
	},
	// bubbling phase
	_bubble = function(e){
		if (e && e.stopPropagation){
			e.preventDefault();
			e.stopPropagation();
		}else{
			window.event.cancelBubble = true;
		}
	},
	// close modal window
	_close = function(){
		if (busy || wrap.is(':hidden')) {
			return;
		}
		busy = true;
		mask.fadeOut(300);
		wrap.fadeOut(300,_abort);
	},
	_datas = function(){
		var formData;
		if (typeof _config.fmDatas === 'function') {
			return _config.fmDatas(_config.fmName);
        }
		if ($.isArray(_config.fmDatas)) {
			return _config.fmDatas;
		}
		if (_config.fmDatas) {
			fmDatas = [];
			$.each(_config.fmDatas, function (name, value) {
				formData.push({name: name, value: value});
			});
			return formData;
		}
		return [];
	},
	_point = function(e){
		if(e.pageX && e.pageY)
			return {x : e.pageX , y : e.pageY};
		return { x : e.clientX+(document.documentElement.scrollLeft || document.body.scrollLeft) ,
					y : e.clientY+(document.documentElement.scrollTop || document.body.scrollTop)
				};
	},
	_size = function(size){
		if(size < 0)
			return "";
		if(size < 1024){
			return (Math.round(size)).toString() + 'byte';
		}else if(size < 1024*1024){
			return (Math.round(size * 100 / 1024) / 100).toString() + 'KB';
		}else{
			return (Math.round(size * 100 / (1024 * 1024)) / 100).toString() + 'MB';
		}
	},
	_total = function(){
		var total = 0;
		$.each(filesStore,function(index,file){
			total += parseInt(file.size || 0);
		});
		return total;
	},
	_xhr = function(id){
		if(xhrs[id]) return xhrs[id];
        try {
            xhrs[id] = new XMLHttpRequest();
        }catch(e){
            try {
                xhrs[id] = new ActiveXObject("Msxml2.XMLHTTP");
            }catch(e){
                try {
                    xhrs[id] = new ActiveXObject("Microsoft.XMLHTTP");
                }catch(e){
                    return false;
                }
            }
        }
        return xhrs[id];
	};
	// main method
	$.fn.upload = function(options){

		_config = $.extend(_config,options);

		_initUI();
		_bindEvent();

		$.each($(this),function(index,me){
			$(me).bind('click',_showUI);
		});
	};
})(jQuery);

 /* 
 * 已知问题:
 * safari浏览器下选择多个文件时获取不到文件大小,且图片文件无法预览(⊙﹏⊙).
 * 360极速浏览器下图片文件无法预览(onload事件不触发╮(╯▽╰)╭).
 * ie7,8,9浏览器下无法获取非图片文件大小.
 * maybe more.....
 */