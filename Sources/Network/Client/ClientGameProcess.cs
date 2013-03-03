using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Net.Sockets;
using System.IO;
using Entity;
using System.Threading;
using System.Windows.Forms;
using Robots_Massacre_Client;
using Inventory;
using Level;
using Entity.Particle.Bonus;
using Gui;

namespace Network
{
	public partial class GameClient
	{
		private List<DateTime> _requestTime;
		private Bonus lastAddedBonus;
		private int lastRemovedBonus = -1;

		private Modes gameMode;
		private int currentTeamCaret = 1;

		private UdpClient _client;
		private IPEndPoint ServerIpEp;
		internal Thread _thread;
		private int _port;

		private const int BASIC_DATA_LENGTH = sizeof(int) + sizeof(float) + sizeof(float) + sizeof(int) + sizeof(bool) + sizeof(int) + sizeof(byte) + sizeof(int) + sizeof(int) + sizeof(int) + sizeof(int);
		private const int BONUS_DATA_LENGTH = sizeof(int) + sizeof(float) + sizeof(float) + sizeof(byte);

		public void Update(Player p)
		{
			int pos = 0;
			int length = BASIC_DATA_LENGTH;
			if (lastAddedBonus != null)
				length += BONUS_DATA_LENGTH;
			byte[] data = new byte[length];

			BinaryHelper.Write(p.Id, ref pos, ref data);
			BinaryHelper.Write(p.X, ref pos, ref data);
			BinaryHelper.Write(p.Y, ref pos, ref data);
			BinaryHelper.Write(p.Direction, ref pos, ref data);
			BinaryHelper.Write(p.Shooting, ref pos, ref data);
			BinaryHelper.Write((int)p.Team, ref pos, ref data);
			BinaryHelper.Write((byte)p.CurrentInvItemAKey, ref pos, ref data);

			if (p.LastUsedInvItem != null)
				BinaryHelper.Write((int)p.LastUsedInvItem.Type, ref pos, ref data);
			else
				BinaryHelper.Write(0, ref pos, ref data);
			BinaryHelper.Write(lastRemovedBonus, ref pos, ref data);
			lastRemovedBonus = -1;
			BinaryHelper.Write(p.Deaths, ref pos, ref data);
			BinaryHelper.Write(p.Kills, ref pos, ref data);
			if (lastAddedBonus != null)
			{
				BinaryHelper.Write(lastAddedBonus.Id, ref pos, ref data);
				BinaryHelper.Write(lastAddedBonus.X, ref pos, ref data);
				BinaryHelper.Write(lastAddedBonus.Y, ref pos, ref data);
				BinaryHelper.Write((byte)lastAddedBonus.Type, ref pos, ref data);
				lastAddedBonus = null;
			}

			_broadcast(data);
		}

		internal void _waitForClientData()
		{
			IPEndPoint ipep = null;
			byte[] data;
			while (true)
			{
				ipep = null;
				try
				{
					data = _client.Receive(ref ipep);

					try
					{
						_analyzeUDPCommand(data, ipep);
					}
					catch (ArgumentOutOfRangeException) { }
				}
				catch (Exception e)
				{
					int n = 0;
					n++;
				}
			}
		}

		private void _analyzeUDPCommand(byte[] data, IPEndPoint ipep)
		{
			for (int i = 0; i < _connections.Count; i++)
			{
				if (_connections[i].Address.Address == ipep.Address.Address && _connections[i].Port == ipep.Port)
					_requestTime[i] = DateTime.Now;
			}

			int pos = 0;
			int id = BinaryHelper.ReadInt32(data, ref pos);

			//check if id is id and not a server command
			if (id >= 0)
			{
				//if id is id
				//load current pos and direction of player
				float x = BinaryHelper.ReadFloat(data, ref pos);
				float y = BinaryHelper.ReadFloat(data, ref pos);
				Directions dir = (Directions)BinaryHelper.ReadInt32(data, ref pos);

				//if player shooted
				bool shooting = BinaryHelper.ReadBool(data, ref pos);
				int team = BinaryHelper.ReadInt32(data, ref pos);

				//selected inv item
				byte curInvItem = BinaryHelper.ReadByte(data, ref pos);
				InvType invType = (InvType)BinaryHelper.ReadInt32(data, ref pos);

				//check if bonus was removed
				int removedBonus = BinaryHelper.ReadInt32(data, ref pos);
				if (removedBonus != -1)
				{
					if (OnBonusRemoved != null)
					{
						OnBonusRemoved(removedBonus);
					}
				}

				//load statistics information
				int Deaths = BinaryHelper.ReadInt32(data, ref pos);
				int Kills = BinaryHelper.ReadInt32(data, ref pos);

				//check if invItem was used
				lock (Players[id])
				{
					Players[id].CurrentInvItemAKey = curInvItem;
					Players[id].X = x;
					Players[id].Y = y;
					Players[id].Direction = dir;
					Players[id].SetTeam((Teams)team);
					Players[id].Kills = Kills;
					Players[id].Deaths = Deaths;

					if (shooting)
						Players[id].Shoot(true);
					if (invType != InvType.Unknown && invType != InvType.Cannon)
					{
						GameLevel.CreateEntity(_createInvItem(invType), id);
					}
				}

				//check if new bonus was created
				if (pos != data.Length)
				{
					int bId = BinaryHelper.ReadInt32(data, ref pos);
					int bx = (int)BinaryHelper.ReadFloat(data, ref pos);
					int by = (int)BinaryHelper.ReadFloat(data, ref pos);
					BonusType type = (BonusType)BinaryHelper.ReadByte(data, ref pos);
					Bonus b = _createBonus(bId, type, bx, by);
					GameLevel.AddBonus(b);
				}
			}
			else
			{
				//if id is a server command
				UDPCommands command = (UDPCommands)id;
				switch (command)
				{
					case UDPCommands.AddPlayer:
						{
							Player t = new Player(Players.Count, 0, 0);
							t.Id = BinaryHelper.ReadInt32(data, ref pos);
							t.Removed = true;
							if (t.Id == Players.Count)
							{
								Players.Add(t);
								_connections.Add(ipep);
								_requestTime.Add(DateTime.Now);
							}
							else
							{
								Players[t.Id] = t;
								_connections[t.Id] = ipep;
								_requestTime[t.Id] = DateTime.Now;
							}
							break;
						}
					case UDPCommands.AddPlayerComplete:
						{
							id = BinaryHelper.ReadInt32(data, ref pos);
							lock (Players[id])
							{
								Players[id].Removed = false;
							}
							break;
						}
					case UDPCommands.ClientDisconnected:
						{
							id = BinaryHelper.ReadInt32(data, ref pos);
							lock (Players[id])
							{
								Players[id] = null;
								_connections[id] = null;
								_requestTime[id] = new DateTime();
							}
							//MessageBox.Show("Client " + id + " disconnected");
							break;
						}
					case UDPCommands.ConnectToGame:
						{
							_connectToGame(ipep);
							break;
						}
					case UDPCommands.ServerChanged:
						{
							long ip = BinaryHelper.ReadLong(data, ref pos);
							if (ip == CIp.Address)
							{
								_isMain = true;
							}
							GameLevel.BonusId = BinaryHelper.ReadInt32(data, ref pos);
							break;
						}
				}
			}
		}

		void findNotActive(object sender, EventArgs e)
		{
			for (int i = 0; i < _requestTime.Count; i++)
			{
				if (_connections[i] == null) continue;
				if (_connections[i].Address != CIp && _connections[i].Port != CPort)
				{
					if ((DateTime.Now - _requestTime[i]).TotalMilliseconds > 800)
					{
						lock (Players[i])
						{
							Players[i] = null;
							_connections[i] = null;
							_requestTime[i] = new DateTime();
						}
						//MessageBox.Show("Client " + i + " disconnected because of no activity for a long time");
						break;
					}
				}
			}
		}
	}
}