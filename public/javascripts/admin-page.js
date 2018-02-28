function setListeners() {
    $('#generate').on('click', function(event){
        $.getJSON('/admin/generate', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('#repo-date-and-time').prop('hidden', false);
        })
    });
    $('#inspect').on('click', function(event){
        $.getJSON('/admin/inspect', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('#repo-date-and-time').prop('hidden', false);
        })
    });
}
