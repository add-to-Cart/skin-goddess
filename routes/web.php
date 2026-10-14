<?php

use Illuminate\Support\Facades\Route;

Route::get('/{path?}', function () {
    abort_unless(is_file(public_path('clinic/index.html')), 503, 'The clinic frontend production build is missing.');

    return response()->file(public_path('clinic/index.html'), ['Cache-Control' => 'no-cache']);
})->where('path', '(?!api(?:/|$)).*')->name('home');
