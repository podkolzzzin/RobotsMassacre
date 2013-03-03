<?php
	function connect()
	{
		$db=mysql_connect("localhost","lugbskt","3MpFwEXy]w%u");
		mysql_select_db("lugbskt_notes",$db);
		mysql_query("SET NAMES 'utf8'",$db);
		return $db;
	}
	$pos=intval($_GET['position']);
	$count=intval($_GET['count']);
	$mode=intval($_GET['mode']);
	$sql="SELECT `cName` FROM `tMaps` WHERE `cMode`='$mode' LIMIT $pos, $count";
	//echo $sql;
	$rez = mysql_query($sql,connect());
	while($map=mysql_fetch_array($rez))
	{
		echo $map['cName'];
		echo "\n";
	}
?>