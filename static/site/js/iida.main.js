/* global angular, iida */
/* jslint browser:true, continue:true, devel:true, indent:2, maxerr:50, newcap:true, nomen:true, plusplus:true, regexp:true, sloppy:true, vars:true, white:true, bitwise:true, sub:true, node:true, unused:vars */

(function() {
  'use strict';

  var moduleName = iida.moduleName;

  // AngularJS
  // モジュールを登録
  angular.module(moduleName, [
    'ngResource', // REST APIを叩くのに必要
    'ngAnimate',
    'ngMessages',
    'ngMaterial',
    'ui.router',
    'angularUtils.directives.dirPagination'
  ]);

  // Angular Materialの動作設定
  angular.module(moduleName).config(['$mdThemingProvider', '$mdIconProvider', function($mdThemingProvider, $mdIconProvider) {
    // テーマ色
    $mdThemingProvider
      .theme('default')
      .primaryPalette('deep-purple')
      .accentPalette('indigo');

    // SVGアイコンを登録
    // https://design.google.com/icons/
    // テンプレートとして先読みしておく
    // <md-icon md-svg-icon="menu"></md-icon>
    $mdIconProvider
      .icon('back', 'ic_arrow_back_black_24px.svg.tpl', 24)
      .icon('menu', 'ic_menu_white_24px.svg.tpl', 24)
      .icon('close', 'ic_close_white_24px.svg.tpl', 24)
      .icon('setting', 'ic_settings_white_24px.svg.tpl', 24)
      .icon('play', 'ic_play_circle_filled_white_24px.svg.tpl', 24);
    //
  }]);

  // $log.debug();によるデバッグメッセージの表示・非表示設定
  angular.module(moduleName).config(['$logProvider', function($logProvider) {
    $logProvider.debugEnabled(true);
  }]);

  // 戻るボタン用のディレクティブ
  // <back></back>
  angular.module(moduleName).directive('back', ['$window', function($window) {
    // オブジェクトを返却
    return {
      restrict: 'E',
      replace: true,
      template: '<button type="button" class="btn btn-primary">戻る</button>',
      link: function(scope, elem, attrs) {
        elem.bind('click', function() {
          $window.history.back();
        });
      }
    };
  }]);

  // サービス 'settingParamService'
  // 各コントローラはこのサービスをインジェクションして、angular.extend()でミックスインして利用する
  angular.module(moduleName).service('settingParamService', [function() {
    var svc = this;

    // 設定条件をまとめたオブジェクト
    svc.settingParam = {
      // ng-ifでこれをバインドすれば、デバッグ目的で入れている要素の表示・非表示が切り替わる
      debug: false,
      // コンフィグを表示するかどうか
      showConf: true
    };
  }]);

  // コントローラ 'settingController'
  angular.module(moduleName).controller('settingController', ['settingParamService', function(settingParamService) {
    var ctrl = this;

    ctrl.title = '動作設定';
    angular.extend(ctrl, settingParamService);
  }]);

  // $resourceファクトリ 'vipResource'
  // REST APIを容易に利用できるようにする
  angular.module(moduleName).factory('vipResource', ['$resource', '$location', function($resource, $location) {
    // :idはプレースホルダなので、/data/vip/100のようなURLに変換される
    var url = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/data/vip/:id';

    // 標準で定義済みのアクション query, get, save, delete
    // 個別定義のアクション update

    return $resource(
      // 第一引数はURL
      url,
      // 第二引数はデフォルトパラメータ
      {
        // オブジェクト内の同名のキーの値に置き換えられる
        id: '@id'
      },
      // 第三引数はアクションの定義
      {
        query: {
          // 複数のデータを取得
          method: 'GET',
          isArray: false // デフォルトはtrue
        },
        get: {
          // 単一のデータを取得
          method: 'GET'
        },
        save: {
          // 新規データを登録
          method: 'POST'
        },
        delete: {
          // 既存データを削除
          method: 'DELETE'
        },
        update: {
          // データを修正
          method: 'PUT'
        }
      }
    );
  }]);

  // サービス
  // 'dataService'
  angular.module(moduleName).service('dataService', ['vipResource', function(vipResource) {
    var svc = this;

    // サービスとして提供するオブジェクト
    svc.ipcom_slb_rules = [];
    svc.ipcom_hostnames = [];
    svc.ipcom_inventories = [];
    svc.ipcom_real_server_map = {}; // リアルサーバのホスト名とIPの対応表
    svc.typeaheads = []; // タイプ補完用

    // データの採取が完了しているか否か
    svc.isDataFetched = false;

    // データがエラーか否か
    svc.isDataError = false;

    // サービス初期化時にJSONデータをロードする
    // heredocが定義されているなら文字列からデータを復元し、そうでないならHTTPでJSONデータを取りに行く
    if (iida.heredoc.slb) {
      console.log('heredocからデータを復元します');
      try {
        var j = JSON.parse(iida.heredoc.slb.text);
        parseJson(j);
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log('HTTPでデータを取得します');
      vipResource
        .query()
        .$promise
        .then(function(data) {
          console.log(data);
          // dataオブジェクトの'vip'キーに必要なJSONデータが入っているので、これを渡して整形する
          // ただし、PythonのサーバでJSONファイルの読み込みに失敗するとnullで返ってくることもある
          parseJson(data.vip);
        })
        .catch(function(data, status) {
          console.log(data);
        });
    }

    // JSONはこういう形式でデータを保持しているので、各配列を分解して公開する
    // {
    //    ipcom_slb_rules: [],
    //    ipcom_hostnames: ['ホスト名', 'ホスト名', ...],
    //    ipcom_inventories: [{インベントリ}, {}, ...],
    // }
    function parseJson(j) {
      if (!j) {
        svc.isDataError = true;
        return;
      }

      // ホスト名一覧はそのまま利用
      if ('ipcom_hostnames' in j) {
        svc.ipcom_hostnames = [].concat(j['ipcom_hostnames']);
      }

      // インベントリ一覧の中に含まれるコンフィグはbase64でエンコードされているのでそれを復元
      if ('ipcom_inventories' in j) {
        svc.ipcom_inventories = [].concat(j['ipcom_inventories']);
      }
      angular.forEach(svc.ipcom_inventories, function(d) {
        var config_base64 = d.config;
        // 空白文字が含まれるとIEはエラーを吐くので、空白文字を削除する
        config_base64 = config_base64.replace(/\s/g, '');
        d.config = window.atob(config_base64);
      });

      // SLBルールの配列
      if ('ipcom_slb_rules' in j) {
        svc.ipcom_slb_rules = [].concat(j['ipcom_slb_rules']);
      }
      // SLBルールには通し番号となるidを追加しておく
      angular.forEach(svc.ipcom_slb_rules, function(v, i) {
        v.id = i + 1; // iは0はじまりなので+1する

        // リアルサーバとIPアドレスの対応表を全てのslb_ruleから抽出する
        angular.extend(svc.ipcom_real_server_map, v.real_server_map);

        // タイプ補完用に仮想IPを追加
        if (svc.typeaheads.indexOf(v.address) < 0) {
          // アドレス情報を追加
          svc.typeaheads.push(v.address);
        }
        // タイプ補完用にdescriptionを追加
        if (svc.typeaheads.indexOf(v.description) < 0) {
          // description情報を追加
          svc.typeaheads.push(v.description);
        }
        // タイプ補完用にリアルサーバの名前とアドレスを追加
        angular.forEach(svc.ipcom_real_server_map, function(value, key) {
          if (svc.typeaheads.indexOf(value) < 0) {
            svc.typeaheads.push(value);
          }
          if (svc.typeaheads.indexOf(key) < 0) {
            svc.typeaheads.push(key);
          }
        });
      });

      // データ取得完了
      svc.isDataFetched = true;
    }

    // 指定した id を持ったslb_ruleを返す関数
    svc.getSlbRuleById = function(id) {
      try {
        id = parseInt(id, 10);
      } catch (e) {
        return null;
      }

      var index = svc.ipcom_slb_rules.length;
      while (index--) {
        var d = svc.ipcom_slb_rules[index];
        if (d.id === id) {
          return d;
        }
      }
      return null;
    };

    // ホスト名からコンフィグを返す関数
    svc.getConfigByName = function(hostname) {
      var index = svc.ipcom_inventories.length;
      while (index--) {
        var d = svc.ipcom_inventories[index];
        if (d.hasOwnProperty('host') && d['host'] === hostname) {
          if (d.hasOwnProperty('config')) {
            return d.config;
          }
        }
      }
      return null;
    };
  }]);

  // UI Router
  // ルーティング設定
  angular.module(moduleName).config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    // 一致しないURLは全て/に飛ばす
    $urlRouterProvider.otherwise('/');

    // ステートとURLを対応付ける
    $stateProvider
      .state('index', {
        url: '/',
        templateUrl: 'index.tpl',
        controller: 'indexController',
        controllerAs: 'indexCtrl'
      })
      .state('vip', {
        url: '/vip',
        templateUrl: 'vip.tpl',
        controller: 'vipController',
        controllerAs: 'vipCtrl'
      })
      .state('vip_detail', {
        url: '/vip_detail:{id}',
        templateUrl: 'vip_detail.tpl',
        controller: 'vipDetailController',
        controllerAs: 'vipDetailCtrl'
      });
  }]);

  // <body>にバインドする最上位のコントローラ
  // 主にレイアウトを担当
  angular.module(moduleName).controller('topController', ['$scope', '$mdMedia', '$mdSidenav', '$mdComponentRegistry', '$window', function($scope, $mdMedia, $mdSidenav, $mdComponentRegistry, $window) {
    var ctrl = this;

    ctrl.logoTitle = 'IPCOM VIP Finder';

    // HTML側で <md-sidenav md-component-id="sidenav"> を指定
    var componentId = 'sidenav';

    function sidenavHidden() {
      return !$mdMedia('gt-sm');
    }

    ctrl.enableShowSidenav = function() {
      // サイドナビが有効になっていない可能性があるため、存在するかどうかを確認する
      // シンプルなアプリならこの確認は不要
      // サイドナビを開けたまま違うページに遷移するなら、このチェックが必要
      if (!$mdComponentRegistry.get(componentId)) {
        return false;
      }
      return sidenavHidden() && !$mdSidenav(componentId).isOpen();
    };

    ctrl.enableCloseSidenav = function() {
      if (!$mdComponentRegistry.get(componentId)) {
        return false;
      }
      return sidenavHidden() && $mdSidenav(componentId).isOpen();
    };

    ctrl.openSidenav = function() {
      if (!$mdComponentRegistry.get(componentId)) {
        return;
      }
      $mdSidenav(componentId).open();
    };

    ctrl.closeSidenav = function() {
      if (!$mdComponentRegistry.get(componentId)) {
        return;
      }
      $mdSidenav(componentId).close();
    };

    ctrl.hideSidenav = function() {
      return sidenavHidden();
    };

    // back()でひとつ前のページに戻る
    ctrl.back = function() {
      $window.history.back();
    };
  }]);

  // トップページ用のコントローラ
  // タイトルとか、日付とか、
  angular.module(moduleName).controller('indexController', [function() {
    var ctrl = this;

    ctrl.title = 'IPCOM VIP Finder';
    ctrl.description = '負荷分散装置として使っている複数のIPCOMの設定を一つにまとめて、必要な情報をすばやく取り出せるようにしました。';
    ctrl.date = '2016/08/11';
    ctrl.author = 'Takamitsu IIDA';
    ctrl.mail = 'iida@jp.fujitsu.com';
  }]);

  // VIP Finder用のコントローラ
  // これの子供にはsearchParamControllerとsearchResultControllerがいる
  angular.module(moduleName).controller('vipController', ['dataService', '$scope', '$mdToast', function(dataService, $scope, $mdToast) {
    var ctrl = this;

    // データ取得が完了しているかどうか、のフラグ
    ctrl.isDataFetched = iida.heredoc.slb ? true : dataService.isDataFetched;

    // dataServiceがデータをとりに行くので、その完了をウォッチして、コントローラの値を反映する
    if (!ctrl.isDataFetched) {
      var handler = $scope.$watch(function() {
        return dataService.isDataFetched;
      }, function(newValue, oldValue) {
        ctrl.isDataFetched = newValue;
        if (handler && ctrl.isDataFetched) {
          // データの取得が完了すれば、それ以降はウォッチ不要
          handler();
          showToast(dataService.ipcom_slb_rules.length.toString() + '件のSLBルールを取得しました');
        }
      });
    }

    function showToast(message) {
      var toast = $mdToast.simple()
        .content(message)
        .position('top right')
        .hideDelay(3000);

      $mdToast.show(toast);
    }
  }]);

  // サービス
  // 'searchParamService'
  // このサービスはIPCOMのホスト名一覧を必要としているので、'dataService'をインジェクションする
  angular.module(moduleName).service('searchParamService', ['dataService', function(dataService) {
    var svc = this;

    // 検索条件をまとめて格納するオブジェクト
    svc.searchParam = {};

    // 検索条件をクリアする関数
    // この関数は外部からも呼ばれる
    svc.clear = function() {
      svc.searchParam.md_selected_item = '';
      svc.searchParam.searchString = '';
      svc.searchParam.place = '全て';
      svc.searchParam.prefix = '全て';
      svc.searchParam.ipcom = '全て';
    };

    // 初期化する
    svc.clear();

    // 検索用の場所の一覧
    svc.places = ['全て', '館林(E-)', '明石(W-)'];

    // 検索用のプレフィクス一覧
    svc.prefixes = ['全て', '10.240', '10.241', '10.244', '10.245', '10.224', '10.228'];

    // 検索用のIPCOMホスト名一覧
    svc.ipcom_hostnames = ['全て'].concat(dataService.ipcom_hostnames);

    // タイプ補完用
    svc.typeaheads = dataService.typeaheads;
  }]);

  // コントローラ
  // 検索条件設定用
  // 'searchParamController'
  angular.module(moduleName).controller('searchParamController', ['searchParamService', 'settingParamService', function(searchParamService, settingParamService) {
    var ctrl = this;

    // サービスが持っているプロパティをこのコントローラで使えるように取り込む
    angular.extend(ctrl, searchParamService);
    angular.extend(ctrl, settingParamService);

    // オートコンプリートの候補を検索して返却する
    ctrl.md_items = function(query) {
      if (!query) {
        return [''];
        // or return ctrl.typeaheads;
      }

      // 検索文字列を小文字にしておく
      var lowercaseQuery = angular.lowercase(query);

      // 配列typeaheadsを検索文字列でフィルタして返却する
      return ctrl.typeaheads.filter(function(data, index) {
        if (data.indexOf(lowercaseQuery) === 0) {
          return true;
        }
        return false;
      });
    };
  }]);

  // フィルタ
  // 場所、アドレス、ホスト名、等の<select>で指定された条件で検索する独自のフィルタ
  // 文字列でのインクリメンタル検索はここではしない
  angular.module(moduleName).filter('search', function() {
    // フィルタは常に関数を返す
    // 第一引数はフィルタ対象の配列、第二引数はHTML側でコロン:を使って指定したもの
    return function(datas, searchParam) {
      // 戻り値（検索結果の配列）
      var filtered = datas;

      // 一時変数
      var arr;

      // 場所でフィルタ
      // svc.places = ['全て', '館林(E-)', '明石(W-)'];
      if (searchParam.place !== '全て') {
        arr = filtered;
        filtered = arr.filter(function(data, index) {
          if (!data.hasOwnProperty('hostnames')) {
            return false;
          }
          var hostnames = data['hostnames'];
          if (!Array.isArray(hostnames)) {
            return false;
          }
          if (searchParam.place === '館林(E-)') {
            if (hostnames[0].lastIndexOf('E-', 0) === 0) {
              return true;
            }
          } else if (searchParam.place === '明石(W-)') {
            if (hostnames[0].lastIndexOf('W-', 0) === 0) {
              return true;
            }
          }
          return false;
        });
      }

      // アドレスでフィルタ
      if (searchParam.prefix !== '全て') {
        arr = filtered;
        filtered = arr.filter(function(data, index) {
          if (!data.hasOwnProperty('address')) {
            return false;
          }
          var address = data['address'];
          if (address.lastIndexOf(searchParam.prefix, 0) === 0) {
            return true;
          }
          return false;
        });
      }

      // IPCOMのホスト名でフィルタ
      if (searchParam.ipcom !== '全て') {
        arr = filtered;
        filtered = arr.filter(function(data, index) {
          if (!data.hasOwnProperty('hostnames')) {
            return false;
          }
          var hostnames = data['hostnames'];
          if (hostnames.indexOf(searchParam.ipcom) >= 0) {
            return true;
          }
          return false;
        });
      }

      return filtered;
    };
  });

  // コントローラ
  // 'searchResultController'
  // $watchするために、$scopeをインジェクトする
  // ui-routerでページ遷移するために$stateをインジェクトする
  // フィルタするために$filterをインジェクトする
  angular.module(moduleName).controller('searchResultController', ['$scope', '$state', '$filter', '$log', 'dataService', 'searchParamService', 'settingParamService', function($scope, $state, $filter, $log, dataService, searchParamService, settingParamService) {
    var ctrl = this;

    // サービスが持っているプロパティをこのコントローラで使えるように取り込む
    angular.extend(ctrl, dataService);
    angular.extend(ctrl, searchParamService);
    angular.extend(ctrl, settingParamService);

    // フィルタされた後のデータ
    ctrl.filtered = dataService.ipcom_slb_rules;

    // テーブルのソート用プロパティ
    ctrl.sortType = 'id';
    ctrl.sortReverse = false;

    // dir-paginateパラメータ
    ctrl.itemsPerPage = 10;

    // ui-routerのページ遷移関数
    // 'vip_detail' に飛ぶ
    ctrl.showDetail = function(ev, id) {
      $state.go('vip_detail', {
        id: id
      });
    };

    // $watchして検索条件に変更が生じたら、フィルタを実行する
    // $scope.$watch( , , true) という指定でオブジェクトの中身の変更を検知できるが処理が重い
    // 配列やオブジェクトの1階層先を見るなら$scope.$watchCollection()を使った方がよい
    $scope.$watchCollection(
      function() {
        return ctrl.searchParam;
      },
      function(value) {
        // $log.debug('検索条件変更に伴うフィルタの再適用');
        // まずは独自の検索条件でフィルタする
        var arr = $filter('search')(ctrl.ipcom_slb_rules, ctrl.searchParam);
        // 次に標準の'filter'フィルタで文字列検索する
        if (ctrl.searchParam.searchString) {
          ctrl.filtered = $filter('filter')(arr, ctrl.searchParam.searchString);
        } else {
          ctrl.filtered = arr;
        }
      }
    );
  }]);

  // コントローラ
  // 'vipDetailController'
  angular.module(moduleName).controller('vipDetailController', ['$stateParams', 'dataService', 'settingParamService', function($stateParams, dataService, settingParamService) {
    var ctrl = this;

    // URLからIDを取り出す
    var id = $stateParams.id;

    // そのIDを持つデータを取り出す
    var d = dataService.getSlbRuleById(id);

    // selectedDataとしてアクセスすることもできるし、
    ctrl.selectedData = d;

    // そのデータの各プロパティに直接アクセスすることもできる
    angular.extend(ctrl, d);

    // 設定情報もアクセスできるようにする
    angular.extend(ctrl, settingParamService);
  }]);

  // 使っていないコントローラ

  // IPCOM一覧を表示するためのコントローラ 'ipcomController'
  angular.module(moduleName).controller('ipcomController', ['dataService', 'settingParamService', function(dataService, settingParamService) {
    var ctrl = this;

    ctrl.title = 'IPCOM一覧';

    // サービスが持っているプロパティをこのコントローラで使えるように取り込む
    angular.extend(ctrl, dataService);
    angular.extend(ctrl, settingParamService);

    // クリックして選択した行のデータ
    ctrl.selectedRow = null;

    // テーブルのソート用プロパティ
    ctrl.sortType = '';
    ctrl.sortReverse = false;
  }]);

  // リアルサーバ一覧を表示するためのコントローラ
  angular.module(moduleName).controller('realController', ['dataService', function(dataService) {
    var ctrl = this;
    ctrl.title = 'リアルサーバ一覧';

    // サービスが持っているプロパティをこのコントローラで使えるように取り込む
    angular.extend(ctrl, dataService);

    // テーブルのソート用プロパティ
    ctrl.sortType = '';
    ctrl.sortReverse = false;
  }]);

  // コントローラ
  // リアルサーバ関連情報用
  // 'vipRealController'
  angular.module(moduleName).controller('vipRealController', ['$stateParams', 'dataService', 'settingParamService', function($params, dataService, settingParamService) {
    var ctrl = this;

    // URLからIDを取り出す
    ctrl.realname = $params.real;

    // そのホスト名を持つ仮想IPを探す
    function getVipsByReal(realname) {
      var vips = [];
      angular.forEach(dataService.ipcom_slb_rules, function(v, i) {
        if (v.hasOwnProperty('real_server_map')) {
          var keys = Object.keys(v['real_server_map']);
          if (keys.indexOf(ctrl.realname) >= 0) {
            vips.push(v);
          }
        }
      });
      return vips;
    }

    ctrl.vips = getVipsByReal(ctrl.realname);
  }]);

  // コントローラ
  // IPCOM設定表示用
  // 'vipConfigController'
  angular.module(moduleName).controller('vipConfigController', ['$stateParams', 'dataService', 'settingParamService', function($params, dataService, settingParamService) {
    var ctrl = this;

    // 設定情報にアクセスできるようにする
    angular.extend(ctrl, settingParamService);

    // URLからIDを取り出す
    var hostname = $params.hostname;

    // そのホスト名を持つIPCOMのコンフィグを取り出してselectedDataとしてアクセスできるようにする
    ctrl.selectedData = dataService.getConfigByName(hostname);
  }]);
})();
