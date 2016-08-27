#!/usr/bin/env python
# -*- coding: utf-8 -*-
u"""WebフレームワークBottleを使ってデータを公開するスクリプトです.
依存外部モジュール
  jsonpickle
"""
# 接頭辞uをつけない文字列をunicodeにする
# unicode_literalsをインポートすると、ASCIIを期待している部分にはb"key"のようにbが必要になるので要注意
from __future__ import unicode_literals
# print('Hello World') 改行あり
# print('Hello World', end='') 改行なし
from __future__ import print_function
from __future__ import division
from __future__ import absolute_import

__author__ = 'Takamitsu IIDA'
__version__ = '0.0'
__date__ = '2016/08/23'

#        1         2         3         4         5         6         7
# 34567890123456789012345678901234567890123456789012345678901234567890123456789
#
import os
import sys
import codecs
import json
import re


def here(path=''):
  u"""相対パスを絶対パスに変換して返却します."""
  return os.path.abspath(os.path.join(os.path.dirname(__file__), path))

# ./libフォルダにおいたpythonスクリプトを読みこませるための処理
sys.path.append(here('./lib'))
sys.path.append(here('./lib/site-packages'))

# bottleフレームワークを読み込む
import bottle
from bottle import HTTPResponse
from bottle import get
from bottle import post
from bottle import put
from bottle import delete
# from bottle import redirect
from bottle import route
from bottle import static_file
from bottle import template
# from bottle import hook

# bottleのデバッグを有効にして、エラー時に詳細な情報を出力する
bottle.debug(True)

import jsonpickle
jsonpickle.set_preferred_backend('json')
jsonpickle.set_encoder_options('json', sort_keys=False, indent=2)
# jsonpickleの使い方
# デフォルトでは余計なクラス情報が付加されるので、unpicklableはFalseに指定する
# json_string = jsonpickle.encode(obj, unpicklable=False)


def save_json(file_path, data):
  u"""JSON形式のデータをファイルに保存します."""
  try:
    with codecs.open(here(file_path), "w", "utf-8") as file:
      json.dump(data, file, indent=2, ensure_ascii=False)
  except Exception:
    pass


def load_json(file_path):
  u"""JSON形式で保存されているデータをファイルから読んで返却します."""
  try:
    with codecs.open(here(file_path), "r", "utf-8") as file:
      text = file.read()
      data = json.loads(text)
  except Exception:
    data = None
  return data


# jsonを保管するオブジェクト
# dataフォルダのoutput.jsonファイルを読み取る
try:
  _vip = load_json(here("./data/output.json"))
except Exception:
  sys.exit(0)


# GETメソッドで_vipを返却
@get('/data/vip')
@get('/data/vip/')
def vip_get_handler():
  u"""VIP一覧をJSONで返却します."""
  # 戻り値となる辞書型データ
  result_dict = {}
  result_dict["status"] = "SUCCESS"  # or ERROR
  result_dict["message"] = u"vipキーにデータを格納して返却"
  result_dict["vip"] = _vip

  r = http_response(status=200)
  r.body = jsonpickle.encode(result_dict, unpicklable=False)
  return r


#        1         2         3         4         5         6         7
# 34567890123456789012345678901234567890123456789012345678901234567890123456789
#
# RESTのテストです。
# GET/POST/DELETE/PUTの使い分けを確認します。
# https://www.toptal.com/bottle/building-a-rest-api-with-bottle-framework

# nameを保管するset
_names = set()

# 名前のパターン
namepattern = re.compile(r'^[a-zA-Z\d]{1,64}$')


# POSTメソッドでクリエイト
@post('/names')
def creation_handler():
  u"""名前を作成します."""
  r = HTTPResponse(status=200)
  r.set_header('Content-Type', 'application/json')

  # 戻り値となる辞書型データ
  result_dict = {}
  result_dict["status"] = "SUCCESS"  # or ERROR
  result_dict["message"] = ""  # str

  try:
    # リクエストからデータを取り出す
    try:
      data = bottle.request.json()
      # data = bottle.request.params.get('taskGroup', "", type=str)
    except Exception:
      raise ValueError

    if not data:
      raise ValueError

    # nameを取り出す
    try:
      name = data.get("name", "", type=str)
      if namepattern.match(name) is None:
        raise ValueError
    except (TypeError, KeyError):
      raise ValueError

    # 存在するかどうかを確認する
    if name in _names:
      raise KeyError
  #
  except ValueError:
    # 渡されたデータがおかしい場合は400を返す
    r.status = 400
    result_dict["status"] = "ERROR"
    result_dict["message"] = u"パラメータエラー, 不正な値が指定されています"
    r.body = json.dumps(result_dict, ensure_ascii=False)
    return r
  except KeyError:
    # 既に存在するnameが渡された場合は409を返す
    r.status = 409
    result_dict["status"] = "ERROR"
    result_dict["message"] = u"パラメータエラー, そのキーは既に存在します"
    r.body = json.dumps(result_dict, ensure_ascii=False)
    return r

  # 名前を追加する
  _names.add(name)

  # 200を返す
  result_dict["status"] = "SUCCESS"
  result_dict["message"] = "追加した名前を返却します"
  result_dict["name"] = name
  r.body = json.dumps(result_dict, ensure_ascii=False)
  return r


# GETメソッドでリストの返却
@get('/names')
def listing_handler():
  u"""名前の一覧を返却します."""
  r = HTTPResponse(status=200)
  r.set_header('Content-Type', 'application/json')
  r.set_header('Cache-Control', 'no-cache')

  # 戻り値となる辞書型データ
  result_dict = {}
  result_dict["status"] = "SUCCESS"  # or ERROR
  result_dict["message"] = "namesキーに配列を入れて一覧を返却します"
  result_dict["names"] = list(_names)

  r.body = json.dumps(result_dict, ensure_ascii=False)
  return r


# PUTメソッドでアップデート
@put('/names/<oldname>')
def update_handler(oldname):
  u"""渡されたnameをアップデートします."""
  r = HTTPResponse(status=200)
  r.set_header('Content-Type', 'application/json')

  # 戻り値となる辞書型データ
  result_dict = {}
  result_dict["status"] = "SUCCESS"  # or ERROR
  result_dict["message"] = ""  # str

  try:
    # データを取り出す
    try:
      data = bottle.request.json()
      # data = bottle.request.params.get('taskGroup', "", type=str)
    except Exception:
      raise ValueError

    # extract and validate new name
    try:
      newname = data.get("name", "", type=str)
      if not namepattern.match(newname):
        raise ValueError
    except (TypeError, KeyError):
      raise ValueError

    # check if updated name exists
    if oldname not in _names:
      raise KeyError(404)

    # check if new name exists
    if newname in _names:
      raise KeyError(409)

  except ValueError:
    r.status = 400
    result_dict["status"] = "ERROR"
    result_dict["message"] = u"パラメータエラー, 不正な値が指定されています"
    r.body = json.dumps(result_dict, ensure_ascii=False)
    return r
  except KeyError as e:
    r.status = e.args[0]
    result_dict["status"] = "ERROR"
    result_dict["message"] = u"パラメータエラー, 指定されたキーが存在しません"
    r.body = json.dumps(result_dict, ensure_ascii=False)
    return r

  # add new name and remove old name
  _names.remove(oldname)
  _names.add(newname)

  # 200を返す
  result_dict["status"] = "SUCCESS"
  result_dict["message"] = "更新した名前を返却します"
  result_dict["name"] = newname
  r.body = json.dumps(result_dict, ensure_ascii=False)
  return r


# DELETEメソッドで削除
@delete('/names/<name>')
def delete_handler(name):
  u"""Handle name deletions."""
  r = HTTPResponse(status=200)
  r.set_header('Content-Type', 'application/json')

  # 戻り値となる辞書型データ
  result_dict = {}
  result_dict["status"] = "SUCCESS"  # or ERROR
  result_dict["message"] = ""  # str

  try:
    # Check if name exists
    if name not in _names:
      raise KeyError
  except KeyError:
    r.status = 404
    result_dict["status"] = "ERROR"
    result_dict["message"] = u"パラメータエラー, 存在しない値が指定されています"
    result_dict["name"] = name
    r.body = json.dumps(result_dict, ensure_ascii=False)
    return r

  # Remove name
  _names.remove(name)
  result_dict["message"] = u"削除したnameを返却します"
  result_dict["name"] = name
  r.body = json.dumps(result_dict, ensure_ascii=False)
  return r


#        1         2         3         4         5         6         7
# 34567890123456789012345678901234567890123456789012345678901234567890123456789
#
# bottleの共通コードです。

def http_response(status=200):
  u"""ヘッダを調整したHTTPResponseオブジェクトを返却します."""
  # set_header()のキーはASCIIを前提としているので、明示的に接頭辞bを付ける
  r = HTTPResponse(status=status)
  r.set_header(b'Content-Type', 'application/json')
  r.set_header(b'Cache-Control', 'no-cache')
  r.set_header(b'Access-Control-Allow-Origin', '*')
  r.set_header(b'Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS')
  r.set_header(b'Access-Control-Allow-Headers', 'Authorization, Origin, Accept, Content-Type, X-Requested-With')
  return r


@route('/', method='OPTIONS')
@route('/<path:path>', method='OPTIONS')
def options_handler(path=None):
  u"""OPTIONメソッドで確認を受けた時は、ボディ部を空っぽにしたレスポンスを返します."""
  r = http_response(status=200)
  return r


@route('/')
@route('/index.htm')
@route('/index.html')
def index():
  u"""トップページ(index)を返却します."""
  return static_file('index.html', root=here('.'))


@route('<:re:.*/static/><path:path>')
def server_static(path):
  u"""URL内に/static/が入っていたら、./staticをルートとしてファイルを返却します."""
  return static_file(path, root=here('./static'))


@route('/favicon.ico')
def favicon():
  u"""./static/site/img/favicon.icoを用意すればブラウザにfaviconが表示されます."""
  return static_file('favicon.ico', root=here('./static/site/img'))


ERROR_MESSAGE = {
  "403": u"パラメータがおかしいかも？",
  "404": u"ページがない？",
  "500": u"内部エラー？"
}


@bottle.error(403)
@bottle.error(404)
@bottle.error(500)
def show_error(err):
  u"""カスタマイズしたエラーページを表示します."""
  message = ERROR_MESSAGE.get(str(err.status_code), "")
  return template("error.tpl", status=err.status, message=message)


#        1         2         3         4         5         6         7
# 34567890123456789012345678901234567890123456789012345678901234567890123456789
#
# __main__


def main():
  u"""HTTPサーバを起動します."""
  # 設定ファイルからホスト名とポートを取得する
  try:
    import ConfigParser
    inifile = ConfigParser.SafeConfigParser()
    inifile.read(here('./index.ini'))
    BOTTLE_HOSTNAME = inifile.get("BOTTLE", "HOSTNAME")
    BOTTLE_PORT = inifile.getint("BOTTLE", "PORT")
  except Exception:
    BOTTLE_HOSTNAME = 'localhost'
    BOTTLE_PORT = 5000

  bottle.run(host=BOTTLE_HOSTNAME, port=BOTTLE_PORT, debug=True, reloader=True)

if __name__ == '__main__':
  main()
