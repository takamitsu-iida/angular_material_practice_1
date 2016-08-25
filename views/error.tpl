<!DOCTYPE html>
<html lang="ja">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">

  <!-- IE9以降で正しく機能するようにする -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />

  <!-- デスクリプション -->
  <meta name="description" content="Error page">
  <meta name="keywords" content="404">
  <meta name="author" content="Takamitsu IIDA">

  <!-- viewportの設定 -->
  <!-- width=device-width 表示領域の幅を端末画面の幅に設定 -->
  <!-- initial-scale=1 表示倍率を１倍に設定 -->
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- faviconの設定 -->
  <!--
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="bookmark" href="/favicon.ico" />
  -->

  <!-- ブラウザのウィンドウやタブに表示されるタイトル -->
  <title>Error</title>

  <!-- Font Awesome -->
  <link href="./static/font-awesome-4.6.3/css/font-awesome.css" rel="stylesheet">

  <!-- Bootstrap -->
  <link href="./static/bootstrap-3.3.6/css/bootstrap.min.css" rel="stylesheet">

  <!-- サイトのCSS -->
  <link href="./static/site/css/site.css" rel="stylesheet">

</head>

<!-- bodyをまるごとiida.appの制御下に置く -->
<body>

  <!-- Bootstrapコンテナ -->
  <div class="container-fluid">
    <div class="row-fluid">
      <div class="container">
        <br>
        <div class="jumbotron panel panel-default">
          <h1>Oops! {{ status }}</h1>
          <p class="lead">{{ message }}</p>
          <hr class="m-y-2">
          <p>
            <a href="/"><button type="button" class="btn btn-primary btn-lg"><i class="fa fa-home"></i>トップ</button></a>
          </p>
        </div>
      </div>
    </div>
  </div>

</body>

</html>
