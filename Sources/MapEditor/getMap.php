<?php
	function connect()
	{
		$db=mysql_connect("localhost","lugbskt","3MpFwEXy]w%u");
		mysql_select_db("lugbskt_notes",$db);
		mysql_query("SET NAMES 'utf8'",$db);
		return $db;
	}
	$mode=intval($_GET['mode']);
	$pos=intval($_GET['position']);
	$sql="SELECT `cData` FROM `tMaps` WHERE `cMode`=$mode LIMIT $pos,1";
	$rez = mysql_query($sql,connect());
	$map=mysql_fetch_array($rez);
	echo $map['cData'];
?>