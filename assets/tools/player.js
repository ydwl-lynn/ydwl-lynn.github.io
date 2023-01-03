const REPEAT_TIMES = 10;

function parse_time(time) {
    // time format is 00:00:49,241 
    let r = /(\d+):(\d+):(\d+),(\d+)/;
    let result = r.exec(time);
    let h = result[1];
    let m = result[2];
    let s = result[3];
    let ms = result[4];
    let seconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
    return seconds;
}

function LS_save(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
}

function LS_load(key) {
    let data = localStorage.getItem(key);
    if (data == undefined) {
        return {}
    }
    return JSON.parse(data);
}

function find_subtitle_by_time(subtitle_list, time) {
    let lo = 0;
    let hi = subtitle_list.length;

    while (lo < hi) {
        let mid = Math.floor((lo + hi) / 2);
        let end = subtitle_list[mid].range.end;
        if (end < time) {
            lo = mid + 1;
        } else if (end > time) {
            hi = mid;
        }
    }
    return subtitle_list[lo];
}

function get_files_form_drop_event(ev) {
    let files = [];
    if (ev.dataTransfer.items) {
        for (var i = 0; i < ev.dataTransfer.items.length; i++) {
            if (ev.dataTransfer.items[i].kind === 'file') {
                var file = ev.dataTransfer.items[i].getAsFile();
                files.push(file);
            }
        }
    } else {
        for (var i = 0; i < ev.dataTransfer.files.length; i++) {
            var file =  ev.dataTransfer.files[i];
            files.push(file);
        }
    }

    return files
}


var app = new Vue({
    el: '#app',
    data: {
        subtitle_list: [],
        current_subtitle: null,
        jumping: false,
        speed: 1,
        subtitle_repeat_times: {},
        repeat: 0,
        show_subtitle_list: true,
        show_current_subtitle: true,
        subtitles_file_name: "",
        video_file_loaded: false,
        show_help_message: false,
        hidden_video: false,
        total_repeat_times: 0
    },
    methods: {
        timeupdate(event) {
            if (this.subtitle_list.length == 0) {
                return;
            }
            let currentTime = this.$refs.video.currentTime;

            if (this.jumping) {
                this.jumping = false;
                return;
            }

            if (this.repeat > 0) {
                if (currentTime > this.current_subtitle.range.end + 0.5) {
                    this.repeat--;
                    if (this.repeat == 0) {
                        let index = (this.current_subtitle.index + 1) % this.subtitle_list.length;
                        this.current_subtitle = this.subtitle_list[index];
                        this.repeat = REPEAT_TIMES;
                        this.scroll_subtitle_into_view();
                    }
                    this.$refs.video.currentTime = this.current_subtitle.range.start - 0.5;
                    this.increase_subtitle_repeat_times(this.current_subtitle.index)
                }
                return;
            }

            let subtitle = find_subtitle_by_time(this.subtitle_list, currentTime);
            if (this.current_subtitle && this.current_subtitle.index != subtitle.index) {
                this.increase_subtitle_repeat_times(this.current_subtitle.index)
                this.scroll_subtitle_into_view();
            }

            this.current_subtitle = subtitle;
        },

        drop_video_file(event) {
            let files = get_files_form_drop_event(event);
            let video_file = null;
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (file.type.startsWith('video')) {
                    video_file = file;
                }
            }

            if (video_file == null) {
                alert("请打开视频文件，目前仅支持 MP4 格式");
            } else {
                var url = URL.createObjectURL(video_file);  
                this.$refs.video_source.setAttribute('src', url);
                this.$refs.video_source.type = video_file.type;
                this.$refs.video.load();
                this.$refs.video.play();
                this.video_file_loaded = true;

            }
        },
        drop_subtitle_file(event) {
            let files = get_files_form_drop_event(event);
            let subtitles_file = null; 
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (file.name.endsWith('.srt')) {
                    subtitles_file = file;
                    break;
                }
            }
            if (subtitles_file == null) {
                alert("请拖入字幕文件，目前仅支持 srt 格式");
            } else {
                let reader = new FileReader();
                reader.onload = (event) => {
                    this.load_subtitles(event.target.result, subtitles_file.name);
                }
                reader.readAsText(subtitles_file);
            }
        },
        scroll_subtitle_into_view() {
            Vue.nextTick(() => {
                let active_item = document.querySelector('.subtitle-list .active + li');
                if (active_item) {
                    active_item.scrollIntoViewIfNeeded();
                }
            });
        },
        set_repeat() {
            this.repeat = this.repeat > 0 ? 0 : REPEAT_TIMES;
        },
        jump_to(subtitle, offset = 0) {
            this.current_subtitle = subtitle;
            Vue.nextTick(() => {
                this.jumping = true;
                this.$refs.video.currentTime = subtitle.range.start + offset;
                this.scroll_subtitle_into_view()
            });
        },
        change_speed() {
            let speed = this.speed + 0.25;
            if (speed > 2.0) {
                speed = 0.5;
            }
            this.speed = speed;
            this.$refs.video.playbackRate = speed;
        },
        increase_subtitle_repeat_times(index) {
            this.total_repeat_times++;
            if (!(index in this.subtitle_repeat_times)) {
                this.subtitle_repeat_times[index] = 1;
            } else {
                this.subtitle_repeat_times[index] += 1;
            }
            if (this.total_repeat_times % 10) {
                this.save_subtitle_repeat_times();
            }
        },
        save_subtitle_repeat_times() {
            LS_save(this.subtitles_file_name, this.subtitle_repeat_times);
            let now = new Date;
            let today = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
            LS_save(this.subtitles_file_name + "_" + today, this.subtitle_repeat_times);
        },
        load_subtitles(text, name) {
            let items = text.split("\r\n\r\n");
            let subtitles = []
            for (let i = 0; i < items.length; i++ ) {
                let lines = items[i].split('\r\n');
                let time_range = lines[1].split(' --> ');

                subtitles.push({
                    index: i,
                    range: {
                        start_human: time_range[0],
                        end_human: time_range[1],
                        start: parse_time(time_range[0]),
                        end: parse_time(time_range[1])
                    },
                    content: lines.slice(2).join('\n')
                });
            }
            this.subtitle_list = subtitles;
            this.current_subtitle = this.subtitle_list[0];
            this.subtitles_file_name = name;
            this.subtitle_repeat_times = LS_load(this.subtitles_file_name);
            console.log("字幕文件成功成功: ", name);
        },
        handle_keyup(key) {
            if (key == 'r') {
                this.set_repeat()
            } else if (key == 'ArrowRight' || key == 'd') {
                let index = this.current_subtitle.index + 1;
                if (index >= this.subtitle_list.length) {
                    index = this.subtitle_list.length - 1;
                }
                let subtitle = this.subtitle_list[index];
                this.jump_to(subtitle);
            } else if (key == 'ArrowLeft' || key == 'a') {
                let index = this.current_subtitle.index - 1;
                if (index < 0) {
                    index = 0;
                }
                let subtitle = this.subtitle_list[index];
                this.jump_to(subtitle);
            } else if (key == ' ') {
                if (this.$refs.video.paused) {
                    this.$refs.video.play();
                } else {
                    this.$refs.video.pause();
                }
            }
        }
    },
    mounted: function() {
        window.addEventListener("keyup", (e) => {
            console.log(e.key);
            Vue.nextTick(() => {
                this.handle_keyup(e.key);
            });
        });
        window.addEventListener("unload", () => {
            this.save_subtitle_repeat_times();
        });
    }
});