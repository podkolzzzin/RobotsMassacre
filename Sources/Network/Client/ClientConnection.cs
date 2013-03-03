using Robots_Massacre_Client;
using Entity;
using Entity.Particle.Bonus;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Net.Sockets;
using Level;

namespace Network
{
	public partial class GameClient
	{
		private void _createGame()
		{
			_connections = new List<IPEndPoint>();

			this._isMain = true;
			this._thread = new Thread(this._waitForClientData);
			this._thread.Start();
			_construct();
			_connections.Add(new IPEndPoint(CIp, CPort));
			_requestTime.Add(DateTime.Now);
		}

		public AddPlayerResult AddPlayer(List<Player> Players)
		{
			this.Players = Players;

			_client.Send(BitConverter.GetBytes((int)UDPCommands.ConnectToGame), sizeof(int), ServerIpEp);
			_getConnections();

			for (int i = 0; i < _connections.Count; i++)
			{
				if (_connections[i] != null)
				{
					currentTeamCaret += 1;
					Player player = new Player(i, 0, 0);
					if (gameMode == Modes.Deathmatch) player.SetTeam((Teams)currentTeamCaret);
					Players.Add(player);
					_requestTime.Add(DateTime.Now);
				}
				else
				{
					Players.Add(null);
					_requestTime.Add(new DateTime());
				}
			}

			AddPlayerResult result = new AddPlayerResult();

			IPEndPoint ipep = null;

			int pos = 0;
			byte[] data = _client.Receive(ref ipep);
			result.Mode = BinaryHelper.ReadInt32(data, ref pos);
			gameMode = (Modes)result.Mode;

			// Receiving 
			var currentGameState = _receiveGameState(_client);

			result.LevelWidth = (int)currentGameState[0];
			result.LevelHeight = (int)currentGameState[1];
			result.Tiles = (List<GEntity>)currentGameState[2];
			result.Entities = (List<GEntity>)currentGameState[3];
			result.Spawners = (List<GEntity>)currentGameState[4];

			data = _client.Receive(ref ipep); // Bonuses data
			result.Bonuses = _getBonuses(data);

			pos = 0;
			data = _client.Receive(ref ipep);
			Spawner spawner = (Spawner)result.Spawners[Program.Rand.Next(0, result.Spawners.Count - 1)];
			CurrentPlayer = new Player(BinaryHelper.ReadInt32(data, ref pos), spawner.X, spawner.Y);
			result.Player = CurrentPlayer;
			if (gameMode == Modes.Deathmatch) result.Player.SetTeam((Teams)currentTeamCaret);
			Players[CurrentPlayer.Id] = CurrentPlayer;
			_requestTime[CurrentPlayer.Id] = DateTime.Now;

			_thread = new Thread(_waitForClientData);
			_thread.Start();
			System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
			timer.Interval = 100;
			timer.Start();
			CurrentPlayer.Removed = true;
			IsConnected = false;
			timer.Tick += _timer_Tick;

			data = new byte[sizeof(int) * 2];
			pos = 0;
			BinaryHelper.Write((int)UDPCommands.AddPlayer, ref pos, ref data);
			BinaryHelper.Write(CurrentPlayer.Id, ref pos, ref data);
			_broadcast(data);

			return result;
		}

		private object[] _receiveGameState(UdpClient _client)
		{
			IPEndPoint ipep = null;
			var data = _client.Receive(ref ipep); // Data of the game-state (tiles, entities, et cetera)
			int length = BitConverter.ToInt32(data, 0);
			data = new byte[length];
			byte[] temp;
			int recieved = 0;
			while (recieved < length)
			{
				temp = _client.Receive(ref ipep);
				temp.CopyTo(data, recieved);
				recieved += temp.Length;
			}
			return BinaryHelper.LoadGameState(data);
		}

		private void _connectToGame(IPEndPoint ipep)
		{
			_sendConnections(ipep);
			_sendGameMode(ipep);
			_sendGameState(ipep);
			_sendBonuses(ipep);
			_sendId(ipep);
		}

		private void _sendBonuses(IPEndPoint ipep)
		{
			var bonuses = Bonuses;
			int length = bonuses.Count * (sizeof(int) + sizeof(int) + sizeof(int) + sizeof(byte)) + sizeof(int);
			byte[] data = new byte[length];
			int pos = 0;

			BinaryHelper.Write(bonuses.Count, ref pos, ref data);
			foreach (KeyValuePair<int, Bonus> B in bonuses)
			{
				BinaryHelper.Write(B.Value.Id, ref pos, ref data);
				BinaryHelper.Write(B.Value.iX, ref pos, ref data);
				BinaryHelper.Write(B.Value.iY, ref pos, ref data);
				BinaryHelper.Write((byte)B.Value.Type, ref pos, ref data);
			}
			_client.Send(data, data.Length, ipep);
		}

		private Dictionary<int, Bonus> _getBonuses(byte[] data)
		{
			int pos = 0;
			int num = BinaryHelper.ReadInt32(data, ref pos);
			Dictionary<int, Bonus> result = new Dictionary<int, Bonus>();
			Bonus b = null;

			for (int i = 0; i < num; i++)
			{
				int bId = BinaryHelper.ReadInt32(data, ref pos);
				int bx = BinaryHelper.ReadInt32(data, ref pos);
				int by = BinaryHelper.ReadInt32(data, ref pos);
				BonusType type = (BonusType)BinaryHelper.ReadByte(data, ref pos);
				b = _createBonus(bId, type, bx, by);
				result.Add(b.Id, b);
			}
			return result;
		}

		private void _sendId(IPEndPoint ipep)
		{
			for (int i = 0; i < _connections.Count; i++)
			{
				if (_connections[i] == null)
				{
					_client.Send(BitConverter.GetBytes(i), sizeof(int), ipep);
					return;
				}
			}
			_client.Send(BitConverter.GetBytes(_connections.Count), sizeof(int), ipep);
		}

		private void _sendGameMode(IPEndPoint ipep)
		{
			_client.Send(BitConverter.GetBytes(Mode), sizeof(int), ipep);
		}

		private const int _MAX_UDP_PACKET_SIZE = 20000;
		private void _sendGameState(IPEndPoint ipep)
		{
			var data = BinaryHelper.SaveGameState(CurrentGameState, Level.GameLevel.CurrentLevelWidth, Level.GameLevel.CurrentLevelHeight);
			int numOfPackets = data.Length / _MAX_UDP_PACKET_SIZE;
			if (data.Length % _MAX_UDP_PACKET_SIZE != 0)
				numOfPackets++;

			_client.Send(BitConverter.GetBytes(data.Length), sizeof(int), ipep);

			int currentPacketSize;
			for (int i = 0; i < numOfPackets; i++)
			{
				if ((i + 1) * _MAX_UDP_PACKET_SIZE > data.Length)
					currentPacketSize = data.Length - i * _MAX_UDP_PACKET_SIZE;
				else
					currentPacketSize = _MAX_UDP_PACKET_SIZE;
				_client.Client.SendTo(data, i * _MAX_UDP_PACKET_SIZE, currentPacketSize, SocketFlags.None, ipep);
			}
		}

		private void _sendConnections(IPEndPoint ipep)
		{
			int length = sizeof(int) + (sizeof(long) + sizeof(int)) * (_connections.Count + 1);
			byte[] data = new byte[length];
			int pos = 0;
			BinaryHelper.Write(_connections.Count, ref pos, ref data);
			foreach (IPEndPoint c in _connections)
			{
				if (c != null)
				{
					BinaryHelper.Write(c.Address.Address, ref pos, ref data);
					BinaryHelper.Write(c.Port, ref pos, ref data);
				}
				else
				{
					BinaryHelper.Write((long)-1, ref pos, ref data);
					BinaryHelper.Write(-1, ref pos, ref data);
				}
			}

			BinaryHelper.Write(ipep.Address.Address, ref pos, ref data);
			BinaryHelper.Write(ipep.Port, ref pos, ref data);

			_client.Send(data, length, ipep);
		}

		private void _getConnections()
		{
			IPEndPoint ipep = null;
			byte[] data = _client.Receive(ref ipep);
			int pos = 0;
			int n = BinaryHelper.ReadInt32(data, ref pos);
			_connections = new List<IPEndPoint>();
			long ip;
			int port;
			for (int i = 0; i < n; i++)
			{
				ip = BinaryHelper.ReadLong(data, ref pos);
				port = BinaryHelper.ReadInt32(data, ref pos);
				if (ip != -1 && port != -1)
				{
					_connections.Add(new IPEndPoint(new IPAddress(ip), port));
				}
				else
				{
					_connections.Add(null);
				}
			}
			_connections.Add(new IPEndPoint(CIp, CPort));
		}

		private void _timer_Tick(object sender, EventArgs e)
		{
			_progress += 0.01;
			try
			{
				AddPlayerProgress(_progress);
			}
			catch { }
			if (_progress >= 1)
			{
				try
				{
					int length = sizeof(int) + sizeof(sbyte);
					byte[] data = new byte[length];
					BitConverter.GetBytes((int)UDPCommands.AddPlayerComplete).CopyTo(data, 0);
					BitConverter.GetBytes(CurrentPlayer.Id).CopyTo(data, sizeof(sbyte));
					_broadcast(data);
					AddPlayerComplete();
				}
				catch { }
				((System.Windows.Forms.Timer)sender).Stop();
				CurrentPlayer.Removed = false;
				IsConnected = true;
			}
		}

		public class AddPlayerResult
		{
			public List<GEntity> Tiles, Spawners, Entities;
			public Dictionary<int, Bonus> Bonuses;
			public Player Player;
			public int LevelWidth, LevelHeight;
			public int Mode;
		}
	}
}